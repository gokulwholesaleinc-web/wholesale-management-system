import { db } from '../../db';
import { sql } from 'drizzle-orm';

// Compatibility shim: maps old ActivityLogger calls to unified activity_events table
export async function addActivityLog(payload: {
  userId: string;
  username: string;
  action: string;           // canonical dot.case
  details: string;
  timestamp: string;        // ISO UTC
  targetId?: string | null;
  targetType?: string | null;
  ipAddress?: string | null;
  meta?: any;
  severity?: number;
  requestId?: string | null;
  actorRole?: string | null;
}) {
  await db.execute(sql`
    INSERT INTO activity_events (at, request_id, actor_id, actor_role, action, subject_type, subject_id, target_type, target_id,
                                 severity, ip, user_agent, meta, diff, hash_prev, hash_self)
    VALUES (
      ${payload.timestamp},
      ${payload.requestId || null},
      ${payload.userId || null},
      ${payload.actorRole || null},
      ${payload.action},
      ${payload.targetType || 'user'},   -- subject_type: default to 'user' if not specified
      ${payload.userId},                 -- subject_id: default to actor
      ${payload.targetType || null},
      ${payload.targetId || null},
      ${payload.severity ?? 20},
      ${payload.ipAddress || null},
      ${null},                           -- user_agent (optional)
      ${JSON.stringify(payload.meta || {})},
      ${JSON.stringify({})},                   -- diff empty from shim
      NULL, NULL                         -- hash fields left for unified helper; acceptable for shim
    )
  `);
}