import type { ApiKey } from './admin.store';
import { ADMIN_DB } from './admin.store';

export function createApiKey(name: string, scopes: string[]): ApiKey {
  const id = crypto.randomUUID();
  const token = crypto.randomUUID().replace(/-/g, '');
  const token_prefix = token.slice(0,8);
  const row: ApiKey = { id, name, scopes, token_prefix };
  ADMIN_DB.keys.set(id, row);
  // You should store the full token securely (server-side), never return it again after initial creation
  return row;
}

export function revokeApiKey(id: string) {
  const row = ADMIN_DB.keys.get(id);
  if (row) { row.revoked = true; ADMIN_DB.keys.set(id,row); }
  return row;
}