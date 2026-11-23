/** Physics time only: pause never spends the recovery lock. */
export function advanceRecoverySeconds(remaining:number,dt:number):number {
  if(!Number.isFinite(dt)||dt<=0)return remaining;
  const next=remaining-dt;return next<1e-8?0:next;
}
