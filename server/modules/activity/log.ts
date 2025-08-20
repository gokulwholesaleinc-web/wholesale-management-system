import { db } from '../../db';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

// Redact sensitive keys recursively
function redact(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const SENSITIVE = /password|secret|token|authorization|auth|apiKey|card|ssn/i;
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = SENSITIVE.test(k) ? '[REDACTED]' : redact(v as any);
  }
  return out;
}

// Canonical JSON with sorted keys for stable hashing
function canonicalize(input: any): string {
  const sorter = (v: any): any => {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(sorter);
    return Object.keys(v).sort().reduce((acc: any, key) => { acc[key] = sorter((v as any)[key]); return acc; }, {});
  };
  return JSON.stringify(sorter(input));
}

export type ActivityEventInput = {
  action: string;                    // canonical dot.case, e.g. 'order.placed'
  subjectType: string;               // 'customer', 'user', 'invoice', etc.
  subjectId: string;                 // uuid
  targetType?: string; targetId?: string;
  severity?: number;                 // 10 info, 20 notice, 30 warn, 40 error
  meta?: any;                        // structured facts (will be redacted)
  diff?: { before?: any; after?: any };
};

export async function logActivity(req: any, e: ActivityEventInput) {
  const ctx = (req as any)?.ctx || {};

  // Convert non-UUID IDs to UUIDs using deterministic namespace
  function ensureUuid(id: string | null): string | null {
    if (!id) return null;
    // Check if already UUID format
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return id;
    }
    // Generate deterministic UUID from string (simple method)
    const hash = crypto.createHash('md5').update(id).digest('hex');
    return `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;
  }

  const record = {
    at: new Date().toISOString(),
    request_id: ctx.requestId || null,
    actor_id: ensureUuid(ctx.userId),
    actor_role: ctx.role || null,
    action: e.action,
    subject_type: e.subjectType,
    subject_id: ensureUuid(e.subjectId),
    target_type: e.targetType || null,
    target_id: ensureUuid(e.targetId),
    severity: e.severity ?? 20,
    ip: ctx.ip || null,
    user_agent: ctx.ua || null,
    meta: redact(e.meta || {}),
    diff: redact(e.diff || {}),
  } as any;

  const payloadForHash = { ...record };
  const hashSelf = crypto.createHash('sha256').update(canonicalize(payloadForHash)).digest('hex');

  // Optimized single query with CTE for hash_prev
  await db.execute(sql`
    WITH prev AS (
      SELECT hash_self FROM activity_events ORDER BY at DESC, id DESC LIMIT 1
    )
    INSERT INTO activity_events (at, request_id, actor_id, actor_role, action, subject_type, subject_id,
      target_type, target_id, severity, ip, user_agent, meta, diff, hash_prev, hash_self)
    VALUES (NOW(), ${record.request_id}, ${record.actor_id}, ${record.actor_role}, ${record.action}, ${record.subject_type}, ${record.subject_id},
      ${record.target_type}, ${record.target_id}, ${record.severity}, ${record.ip}, ${record.user_agent},
      ${JSON.stringify(record.meta)}, ${JSON.stringify(record.diff)}, (SELECT hash_self FROM prev), ${hashSelf})
  `);

  return { hashSelf };
}