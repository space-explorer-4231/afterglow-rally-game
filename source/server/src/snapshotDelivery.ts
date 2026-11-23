import type {RelaySocket} from './relaySocket.js';

export const MAX_SNAPSHOT_QUEUE_BYTES = 128 * 1024;
/** Skip obsolete snapshots for a slow peer; reliable room/race events use their normal path. */
export function sendLatestSnapshot(ws: Pick<RelaySocket,'readyState'|'bufferedAmount'|'send'>, serialized: string): boolean {
  if (ws.readyState !== 1 || (ws.bufferedAmount !== undefined && ws.bufferedAmount >= MAX_SNAPSHOT_QUEUE_BYTES)) return false;
  ws.send(serialized); return true;
}

