import type {RaceCupState, RaceCupStanding, RaceRoundState, RaceStanding} from '../types.js';

const POINTS = [12, 10, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1];
/** Room-owned, three-completed-race championship. Aborted starts never spend a race. */
export class RaceCup {
  private number = 1;
  private completed = 0;
  private lastScoredRound = 0;
  private readonly entries = new Map<string, RaceCupStanding>();

  begin(): void {
    if (this.completed !== 3) return;
    this.number++;
    this.completed = 0;
    this.entries.clear();
  }

  complete(round: RaceRoundState): void {
    if (round.phase !== 'results' || round.round <= this.lastScoredRound || this.completed === 3) return;
    this.lastScoredRound = round.round;
    this.completed++;
    for (const entry of this.entries.values()) entry.lastPoints = 0;
    let place = 0;
    for (const driver of round.standings) {
      const entry = this.entries.get(driver.id) ?? this.newEntry(driver);
      entry.nickname = driver.nickname;
      if (driver.status === 'finished' && driver.finishMs !== null) {
        entry.lastPoints = POINTS[place++] ?? 1;
        entry.points += entry.lastPoints;
        entry.finishes++;
        entry.totalMs += driver.finishMs;
        if (place === 1) entry.wins++;
      }
      this.entries.set(driver.id, entry);
    }
  }

  snapshot(racers: readonly RaceStanding[]): RaceCupState {
    const entries = new Map(this.entries);
    for (const driver of racers) if (!entries.has(driver.id)) entries.set(driver.id, this.newEntry(driver));
    const standings = [...entries.values()].map(entry => ({...entry})).sort((a,b) =>
      b.points-a.points || b.wins-a.wins || b.finishes-a.finishes || a.totalMs-b.totalMs || a.id.localeCompare(b.id));
    return {number:this.number,race:Math.min(3,this.completed+(racers.some(driver=>driver.status==='racing')?1:0))||1,
      completed:this.completed,totalRaces:3,standings,
      championId:this.completed===3 && standings[0]?.points>0 ? standings[0].id : null};
  }

  private newEntry(driver: RaceStanding): RaceCupStanding {
    return {id:driver.id,nickname:driver.nickname,points:0,wins:0,finishes:0,totalMs:0,lastPoints:0};
  }
}
