import { ADMIN_DB, type JobRow } from './admin.store';

export function listJobs() {
  return [...ADMIN_DB.jobs.values()].sort((a,b)=>b.updated_at.localeCompare(a.updated_at));
}

export function retryJob(id: string) {
  const j = ADMIN_DB.jobs.get(id); if (!j) return null;
  j.status = 'queued'; j.attempts += 1; j.updated_at = new Date().toISOString();
  ADMIN_DB.jobs.set(id, j);
  return j;
}

export function cancelJob(id: string) {
  const j = ADMIN_DB.jobs.get(id); if (!j) return null;
  j.status = 'failed'; j.updated_at = new Date().toISOString();
  ADMIN_DB.jobs.set(id, j);
  return j;
}