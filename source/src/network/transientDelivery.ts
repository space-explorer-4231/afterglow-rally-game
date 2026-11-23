export const MAX_TRANSIENT_QUEUE_BYTES = 128 * 1024;
export function canSendTransient(readyState: number, queuedBytes: number): boolean {
  return readyState === 1 && Number.isFinite(queuedBytes) && queuedBytes >= 0 && queuedBytes < MAX_TRANSIENT_QUEUE_BYTES;
}
