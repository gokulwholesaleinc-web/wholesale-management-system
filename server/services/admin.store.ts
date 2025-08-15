export type AdminUser = { id: string; email: string; name: string; roles: string[]; suspended: boolean; last_login?: string };
export type Role = { id: string; name: string; perms: string[] };
export type ApiKey = { id: string; name: string; scopes: string[]; token_prefix: string; last_used?: string; revoked?: boolean };
export type FeatureFlag = { key: string; on: boolean; note?: string; targeting?: { roles?: string[]; stores?: string[]; pct?: number } };
export type JobRow = { id: string; type: string; status: 'queued'|'running'|'failed'|'done'; attempts: number; updated_at: string };

export const ADMIN_DB = {
  users: new Map<string, AdminUser>(),
  roles: new Map<string, Role>(),
  keys: new Map<string, ApiKey>(),
  flags: new Map<string, FeatureFlag>(),
  jobs: new Map<string, JobRow>()
};

// seed
(function seed(){
  const owner: AdminUser = { id: 'U-ADMIN-1', email: 'owner@example.com', name: 'Owner', roles: ['OWNER'], suspended: false };
  ADMIN_DB.users.set(owner.id, owner);
  
  ADMIN_DB.roles.set('OWNER', { id: 'OWNER', name: 'Owner', perms: [] });
  ADMIN_DB.roles.set('ADMIN', { id: 'ADMIN', name: 'Admin', perms: [] });
  ADMIN_DB.roles.set('MANAGER', { id: 'MANAGER', name: 'Manager', perms: [] });
  ADMIN_DB.roles.set('SUPPORT', { id: 'SUPPORT', name: 'Support', perms: [] });
  ADMIN_DB.roles.set('VIEWER', { id: 'VIEWER', name: 'Viewer', perms: [] });

  ADMIN_DB.flags.set('pos.v2', { key: 'pos.v2', on:true, note:'New /instore POS UI', targeting: { roles: ['OWNER'], pct: 100 } });
  ADMIN_DB.jobs.set('J1', { id: 'J1', type:'invoice.regeneration', status: 'done', attempts:1, updated_at: new Date().toISOString() });
})();