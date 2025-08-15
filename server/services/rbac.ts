export type Permission =
  | 'admin.read'
  | 'admin.users.read' | 'admin.users.write'
  | 'admin.roles.read' | 'admin.roles.write'
  | 'admin.keys.read' | 'admin.keys.write'
  | 'admin.flags.read' | 'admin.flags.write'
  | 'admin.jobs.read' | 'admin.jobs.write'
  | 'admin.audit.read' | 'admin.audit.export'
  | 'admin.impersonate';

export const ROLE_PERMS: Record<string, Permission[]> = {
  OWNER: ['admin.read', 'admin.users.read', 'admin.users.write', 'admin.roles.read', 'admin.roles.write', 'admin.keys.read', 'admin.keys.write', 'admin.flags.read', 'admin.flags.write', 'admin.jobs.read', 'admin.jobs.write', 'admin.audit.read', 'admin.audit.export', 'admin.impersonate'],
  ADMIN: ['admin.read', 'admin.users.read', 'admin.users.write', 'admin.roles.read', 'admin.roles.write', 'admin.keys.read', 'admin.keys.write', 'admin.flags.read', 'admin.flags.write', 'admin.jobs.read', 'admin.jobs.write', 'admin.audit.read', 'admin.audit.export'],
  MANAGER: ['admin.read', 'admin.users.read', 'admin.keys.read', 'admin.flags.read', 'admin.flags.write', 'admin.jobs.read'],
  SUPPORT: ['admin.read', 'admin.users.read', 'admin.keys.read', 'admin.flags.read', 'admin.jobs.read'],
  VIEWER: ['admin.read', 'admin.audit.read']
};

export function userHas(reqRoles: string[], perm: Permission) {
  return reqRoles.some(r => ROLE_PERMS[r]?.includes(perm));
}