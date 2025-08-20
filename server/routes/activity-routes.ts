import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { logActivity } from '../modules/activity/log';
import { requireAuth, requireAdmin } from '../simpleAuth';
import crypto from 'crypto';

const router = Router();

// Protect all activity routes - admin only
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/activity?subject_type=&subject_id=&action=&actor_id=&from=&to=&limit=
router.get('/', async (req, res) => {
  try {
    const Q = z.object({
      subject_type: z.string().optional(),
      subject_id: z.string().uuid().optional(),
      action: z.string().optional(),
      actor_id: z.string().uuid().optional(),
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
      limit: z.coerce.number().int().min(1).max(500).default(100),
    }).parse(req.query);

    const where = sql`${sql.raw('1=1')}`
      .append(Q.subject_type ? sql` AND subject_type = ${Q.subject_type}` : sql``)
      .append(Q.subject_id ? sql` AND subject_id = ${Q.subject_id}` : sql``)
      .append(Q.action ? sql` AND action = ${Q.action}` : sql``)
      .append(Q.actor_id ? sql` AND actor_id = ${Q.actor_id}` : sql``)
      .append(Q.from ? sql` AND at >= ${Q.from}` : sql``)
      .append(Q.to ? sql` AND at <= ${Q.to}` : sql``);

    const { rows } = await db.execute(sql`SELECT * FROM activity_events WHERE ${where} ORDER BY at DESC, id DESC LIMIT ${Q.limit}`);
    return res.json({ rows });
  } catch (error) {
    console.error('Activity query error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// SSE stream: /api/activity/stream?subject_type=&subject_id=&action=&actor_id=&token=
router.get('/stream', async (req, res) => {
  try {
    const Q = z.object({ 
      subject_type: z.string().optional(), 
      subject_id: z.string().uuid().optional(), 
      action: z.string().optional(), 
      actor_id: z.string().uuid().optional(),
      token: z.string().optional()
    }).parse(req.query);

    // Authenticate using token from query parameter (EventSource doesn't support custom headers)
    console.log('[SSE] Token received in query:', Q.token ? 'present' : 'missing');
    if (Q.token) {
      // Temporarily set authorization header for auth middleware
      req.headers.authorization = `Bearer ${Q.token}`;
      console.log('[SSE] Authorization header set');
    } else {
      console.log('[SSE] No token provided in query parameters');
    }

    // Manual authentication check since we need to handle query token
    const { requireAuth } = await import('../simpleAuth');
    
    try {
      await new Promise<void>((resolve, reject) => {
        requireAuth(req, res, (error: any) => {
          if (error) reject(error);
          else resolve();
        });
      });
    } catch (error) {
      console.log('[SSE Auth] Authentication failed:', error);
      return res.status(401).json({ error: 'Unauthorized - please log in' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // prevent proxy buffering
    res.flushHeaders?.();

    let lastAt: string | null = new Date(Date.now() - 5_000).toISOString();
    let closed = false;
    req.on('close', () => { closed = true; });

    const hb = setInterval(() => { if (!closed) res.write(`:\n\n`); }, 10_000);

    async function poll() {
      if (closed) return;
      const where = sql`${sql.raw('1=1')}`
        .append(Q.subject_type ? sql` AND subject_type = ${Q.subject_type}` : sql``)
        .append(Q.subject_id ? sql` AND subject_id = ${Q.subject_id}` : sql``)
        .append(Q.action ? sql` AND action = ${Q.action}` : sql``)
        .append(Q.actor_id ? sql` AND actor_id = ${Q.actor_id}` : sql``)
        .append(lastAt ? sql` AND at > ${lastAt}` : sql``);

      try {
        const { rows } = await db.execute(sql`SELECT * FROM activity_events WHERE ${where} ORDER BY at ASC, id ASC LIMIT 200`);
        for (const row of rows) { 
          lastAt = row.at; 
          res.write(`data: ${JSON.stringify(row)}\n\n`); 
        }
      } catch (error) {
        console.error('Activity stream poll error:', error);
      }
      setTimeout(poll, 2000);
    }
    poll();
    req.on('close', () => { clearInterval(hb); });
  } catch (error) {
    console.error('Activity stream error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test POST endpoint
router.post('/', async (req: any, res) => {
  try {
    const body = req.body || {};
    const out = await logActivity(req, {
      action: body.action || 'test.event',
      subjectType: body.subjectType || 'system',
      subjectId: body.subjectId || '00000000-0000-0000-0000-000000000000',
      targetType: body.targetType,
      targetId: body.targetId,
      severity: body.severity,
      meta: body.meta,
      diff: body.diff,
    });
    res.json({ ok: true, ...out });
  } catch (error) {
    console.error('Activity log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Audit verification endpoint
router.get('/verify', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 5000), 20000);
    const { rows } = await db.execute(sql`
      SELECT id, at, request_id, actor_id, actor_role, action, subject_type, subject_id,
             target_type, target_id, severity, ip, user_agent, meta, diff, hash_prev, hash_self
      FROM activity_events ORDER BY at ASC, id ASC LIMIT ${limit}
    `);

    let prevHash: string | null = null;
    let ok = true;
    for (const r of rows) {
      const payload: any = { ...r };
      delete payload.hash_prev; 
      delete payload.hash_self;
      // canonicalize by sorting keys
      const json = JSON.stringify(payload, Object.keys(payload).sort());
      const calc = crypto.createHash('sha256').update(json).digest('hex');
      if (r.hash_prev !== prevHash || r.hash_self !== calc) { 
        ok = false; 
        break; 
      }
      prevHash = r.hash_self;
    }
    res.json({ ok, checked: rows.length });
  } catch (error) {
    console.error('Activity verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;