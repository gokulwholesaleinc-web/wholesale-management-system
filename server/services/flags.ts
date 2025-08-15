import type { FeatureFlag } from './admin.store';
import { ADMIN_DB } from './admin.store';

export function setFlag(key: string, on: boolean, note?: string, targeting?: FeatureFlag['targeting']): FeatureFlag {
  const row: FeatureFlag = { key, on, note, targeting };
  ADMIN_DB.flags.set(key, row);
  return row;
}