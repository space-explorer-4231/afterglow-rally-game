import type { RaceStartState } from '../types.js';

/** Server-owned grid, ballot and shared starting clock. No per-frame room allocations. */
export class RaceStartGate {
  private readonly members = new Map<string, boolean>();
  private readonly votes = new Set<string>();
  private phase: RaceStartState['phase'] = 'waiting';
  private round = 1;
  private startAt: number | null = null;
  private racers: string[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private rematchPending=false;

  constructor(private readonly changed: () => void,private readonly automaticRematches=false) {}

  /** Add loading clients to the denominator; countdown/active arrivals wait for the next grid. */
  join(id: string): void {
    this.members.set(id, false);
    this.changed();
  }

  /** Scene readiness is explicitly acknowledged, independently of membership. */
  ready(id: string): void {
    if (!this.members.has(id) || this.members.get(id)) return;
    this.members.set(id, true);
    if(this.rematchPending&&this.start())return;
    if (!this.tryMajority()) this.changed();
  }

  /** Departures revoke votes; voting closes immediately below three connected players. */
  leave(id: string): void {
    this.members.delete(id);
    this.votes.delete(id);
    this.racers = this.racers.filter(racer => racer !== id);
    if (this.members.size < 3) this.votes.clear();
    if (this.phase !== 'waiting' && this.racers.length === 0) {
      this.reset();
    } else if (!(this.rematchPending&&this.start())&&!this.tryMajority()) {
      this.changed();
    }
  }

  /** Caller authenticates host identity using its WebSocket session, never a supplied player ID. */
  start(): boolean {
    if (this.phase !== 'waiting' || !this.allReady()) return false;
    this.phase = 'countdown';
    this.rematchPending=false;
    this.startAt = Date.now() + 3000;
    this.racers = Array.from(this.members.keys());
    this.changed();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.phase = 'racing';
      this.changed();
    }, 3000);
    return true;
  }

  /** Idempotent ballots prevent repeat packets and vote spam from multiplying a player's vote. */
  vote(id: string, voted: boolean): boolean {
    if (this.phase !== 'waiting' || this.members.size < 3 || !this.members.get(id)) return false;
    if (this.votes.has(id) === voted) return true;
    if (voted) this.votes.add(id); else this.votes.delete(id);
    if (!this.tryMajority()) this.changed();
    return true;
  }

  /** Re-form the grid without reloading the map or dropping the room. */
  complete():void {
    if(this.phase!=='racing')return;
    this.phase='results';this.changed();
    if(this.automaticRematches)this.timer=setTimeout(()=>{
      this.timer=null;this.reset();this.rematchPending=true;this.start();
    },10000);
  }

  /** Re-form the grid without reloading the map or dropping the room. */
  reset(): void {
    this.destroy();
    this.round++;
    this.phase = 'waiting';
    this.startAt = null;
    this.racers = [];
    this.votes.clear();
    this.changed();
  }

  /** One small state message per lifecycle change, separate from vehicle snapshots. */
  snapshot(): RaceStartState {
    return {phase: this.phase, round: this.round, startAt: this.startAt,
      readyIds: Array.from(this.members).filter(([, ready]) => ready).map(([id]) => id),
      memberIds: Array.from(this.members.keys()), votedIds: Array.from(this.votes),
      racerIds: this.racers.slice(), requiredVotes: Math.floor(this.members.size / 2) + 1};
  }

  /** Clear the countdown when a room is reaped or the server shuts down. */
  destroy(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.rematchPending=false;
  }

  private allReady(): boolean {
    return this.members.size > 0 && Array.from(this.members.values()).every(Boolean);
  }

  private tryMajority(): boolean {
    return this.phase === 'waiting' && this.members.size >= 3 &&
      this.votes.size >= Math.floor(this.members.size / 2) + 1 && this.start();
  }
}
