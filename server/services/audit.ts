export type AuditEvent = {
  id: string;
  at: string;
  actor_id: string;
  actor_email: string;
  type: string; // e.g., 'USER_SUSPEND', 'FLAG_TOGGLE'
  resource: string; // e.g., 'user:U123', 'flag:pos.v2'
  payload?: any; // redacted if sensitive
};

const events: AuditEvent[] = [];

export function recordAudit(e: Omit<AuditEvent, 'id'|'at'>) {
  const row: AuditEvent = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    ...e
  };
  events.push(row);
  return row;
}

export function queryAudit({ q = '', from, to, type }: { q?: string; from?: string; to?: string; type?: string }) {
  let rows = [...events];
  if (q) {
    const s = q.toLowerCase();
    rows = rows.filter(r => r.actor_email.toLowerCase().includes(s) || r.resource.toLowerCase().includes(s) || r.type.toLowerCase().includes(s));
  }
  if (type) rows = rows.filter(r => r.type === type);
  if (from) rows = rows.filter(r => r.at >= from);
  if (to) rows = rows.filter(r => r.at <= to);
  return rows.sort((a,b)=>b.at.localeCompare(a.at));
}