export type SurfaceType = 'tarmac' | 'gravel' | 'mud' | 'sand' | 'grass' | 'snow';

export interface VehicleTelemetryPayload {
  seq: number;
  time: number;
  pos: [number, number, number];
  rot: [number, number, number, number];
  linVel: [number, number, number];
  angVel: [number, number, number];
  steer: number;
  wheelRots: [number, number, number, number];
  /** Actual hub heights relative to the rigid chassis [FL, FR, RL, RR]. */
  wheelY?: [number, number, number, number];
  rpm: number;
  gear: number;
  isDrifting: boolean;
  burnout?: boolean;
  nitroActive?: boolean;
  drivetrain?: 'FWD' | 'RWD' | 'AWD';
  surface: SurfaceType;
  score?: number;
}

export interface RemotePlayerSummary {
  id: string;
  nickname: string;
  vehicleId: string;
  slotIndex: number;
  ping: number;
}

export type GameMode = 'freeroam' | 'timeattack' | 'gymkhana_blitz' | 'tag';

export interface RoomSummary {
  id: string;
  name: string;
  hostId: string;
  hostNickname: string;
  levelId: string;
  gameMode: GameMode;
  playerCount: number;
  maxPlayers: number;
  createdAt: number;
  isPersistent?: boolean;
}

export interface EntitySnapshot {
  time: number;
  pos: [number, number, number];
  rot: [number, number, number, number];
  linVel: [number, number, number];
  angVel: [number, number, number];
  steer: number;
  wheelRots: [number, number, number, number];
  /** Actual hub heights relative to the rigid chassis [FL, FR, RL, RR]. */
  wheelY?: [number, number, number, number];
  rpm: number;
  gear: number;
  isDrifting: boolean;
  burnout?: boolean;
  nitroActive?: boolean;
  drivetrain?: 'FWD' | 'RWD' | 'AWD';
  surface: SurfaceType;
  score?: number;
}

export interface TagLeaderboardEntry {
  id: string;
  nickname: string;
  vehicleId: string;
  timeClean: number;
  tagsMade: number;
}

/** Server-authoritative multiplayer starting grid and strict-majority ballot. */
export interface RaceStartState {
  phase: 'waiting' | 'countdown' | 'racing' | 'results';
  round: number;
  startAt: number | null;
  memberIds: string[];
  readyIds: string[];
  votedIds: string[];
  racerIds: string[];
  requiredVotes: number;
}

export type ClientMessage =
  | { type: 'race_start' }
  | { type: 'race_reset' }
  | { type: 'race_vote'; voted: boolean }
  | {
      type: 'request_rooms';
    }
  | {
      type: 'create_room';
      name: string;
      nickname: string;
      vehicleId: string;
      levelId: string;
      gameMode?: GameMode;
    }
  | {
      type: 'join_room';
      roomId: string;
      nickname: string;
      vehicleId: string;
    }
  | {
      type: 'delete_room';
      roomId: string;
    }
  | {
      type: 'leave_room';
      roomId: string;
    }
  | {
      type: 'join_lobby';
      nickname: string;
      vehicleId: string;
      levelId: string;
    }
  | {
      type: 'leave_lobby';
    }
  | {
      type: 'telemetry';
      payload: VehicleTelemetryPayload;
    }
  | {
      type: 'ping';
      clientTime: number;
    }
  | {
      type: 'client_ready';
    }
  | {
      type: 'tag_touch';
      targetPlayerId: string;
    };

export type ServerMessage =
  | { type: 'race_round'; roomId:string; state:RaceRoundState|null }
  | { type: 'race_state'; roomId: string; hostId: string; hostNickname: string; serverTime: number; state: RaceStartState }
  | {
      type: 'rooms_list';
      rooms: RoomSummary[];
    }
  | {
      type: 'room_created';
      room: RoomSummary;
    }
  | {
      type: 'room_joined';
      selfId: string;
      room: RoomSummary;
      players: RemotePlayerSummary[];
    }
  | {
      type: 'room_deleted';
      roomId: string;
      reason: string;
    }
  | {
      type: 'lobby_joined';
      selfId: string;
      room: string;
      players: RemotePlayerSummary[];
    }
  | {
      type: 'player_joined';
      player: RemotePlayerSummary;
    }
  | {
      type: 'player_left';
      playerId: string;
      reason: string;
    }
  | {
      type: 'world_snapshot';
      serverTime: number;
      entities: Record<string, EntitySnapshot>;
    }
  | {
      type: 'pong';
      clientTime: number;
      serverTime: number;
    }
  | {
      type: 'gymkhana_spectate';
      isSpectator: boolean;
      targetId: string | null;
      targetNickname: string | null;
      roundTimeRemaining: number;
    }
  | {
      type: 'gymkhana_round_ended';
      intermissionRemaining: number;
      leaderboard: Array<{
        id: string;
        nickname: string;
        vehicleId: string;
        score: number;
      }>;
    }
  | {
      type: 'gymkhana_round_start';
      duration: number;
      countdown: number;
    }
  | {
      type: 'tag_match_countdown';
      countdown: number;
      assignedSpawnIndex: number;
    }
  | {
      type: 'tag_match_start';
      roundDuration: number;
      taggerId: string;
      assignedSpawnIndex: number;
    }
  | {
      type: 'tag_passed';
      oldTaggerId: string;
      newTaggerId: string;
      freezeDurationMs: number;
    }
  | {
      type: 'tag_match_ended';
      intermissionRemaining: number;
      leaderboard: TagLeaderboardEntry[];
    }
  | {
      type: 'tag_spectate';
      isSpectator: boolean;
      targetId: string | null;
      targetNickname: string | null;
      roundTimeRemaining: number;
    }
  | {
      type: 'error';
      code: string;
      message: string;
    }
  | {
      type: 'version_mismatch';
      serverVersion: string;
      clientVersion: string;
      message: string;
    };

/** One driver's server-observed checkpoint progress and one-lap outcome. */
export interface RaceStanding {
  id:string; nickname:string; vehicleId:string;
  status:'racing'|'finished'|'dnf'; reason:'left'|'teleport'|'timeout'|null;
  finishMs:number|null; completedCheckpoints:number;
}
/** Shared race progress and results, timed from the server GO epoch. */
export interface RaceRoundState {
  round:number;startAt:number;deadlineAt:number;phase:'racing'|'results';totalCheckpoints:number;standings:RaceStanding[]; cup?:RaceCupState;
}

export interface RaceCupStanding {
  id:string; nickname:string; points:number; wins:number; finishes:number; totalMs:number; lastPoints:number;
}
export interface RaceCupState {
  number:number; race:number; completed:number; totalRaces:3; championId:string|null; standings:RaceCupStanding[];
}
