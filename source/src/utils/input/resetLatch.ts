export function createResetLatch(){return {pending:false,held:false};}
export type ResetLatch=ReturnType<typeof createResetLatch>;
/** A one-tick confirmation survives any number of fixed steps before a rendered frame. */
export function captureReset(latch:ResetLatch,requested:boolean):void {
  if(requested&&!latch.held)latch.pending=true;
  latch.held=requested;
}
export function consumeReset(latch:ResetLatch):boolean {const pending=latch.pending;latch.pending=false;return pending;}
export function clearReset(latch:ResetLatch):void {latch.pending=false;latch.held=false;}
