import { GAME_VERSION } from '@/config/version';

/** Refresh un-hashed game assets when a release changes their contents. */
export function versionedAsset(path: string): string {
  return `${path}${path.includes('?') ? '&' : '?'}v=${GAME_VERSION}`;
}
