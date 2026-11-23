import {isDriveReady} from '@/utils/driveReady';
import { canSendTransient } from './transientDelivery';
import type {
  ClientMessage,
  ServerMessage,
  VehicleTelemetryPayload,
} from '@/types/network';
import type { GameMode } from '@/types/game';
import { parseServerMessage } from './packetValidator';
import { SnapshotRingBuffer } from './snapshotRingBuffer';
import {compactTelemetry} from './compactTelemetry';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { useGameStore } from '@/store/gameStore';
import { useGymkhanaStore } from '@/store/gymkhanaStore';
import { useDriftClubStore } from '@/store/driftClubStore';
import { useTagStore } from '@/store/tagStore';
import { GAME_VERSION } from '@/config/version';

export const TELEMETRY_SEND_INTERVAL_MS = 50; // 20Hz; renderer interpolates between snapshots
const PING_INTERVAL_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

export const DEFAULT_REMOTE_WS_URL = 'ws://127.0.0.1:8791/ws';

/** Use this game's own server for local, LAN and public-link multiplayer. */
export function getWebSocketEndpoint(): string {
  const configured = import.meta.env?.VITE_WS_URL;
  if (configured) return configured;
  if (typeof window === 'undefined') return DEFAULT_REMOTE_WS_URL;
  const location = window.location;
  const explicit = new URLSearchParams(location.search).get('ws');
  if (explicit === 'local') return `ws://${location.hostname || '127.0.0.1'}:8791/ws`;
  if (explicit && explicit !== 'remote' && /^wss?:\/\//.test(explicit)) return explicit;
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
}

/**
 * Enterprise-grade WebSocket Network Client managing session lifecycle,
 * heartbeat telemetry, exponential backoff reconnection, and entity ring buffers.
 */
export class NetworkClient {
  private ws: WebSocket | null = null;
  private endpoint: string = '';
  private reconnectAttempts: number = 0;
  private reconnectTimeoutId: number | null = null;
  private pingIntervalId: number | null = null;
  private lastTelemetrySendTime: number = 0;
  private sequence: number = 0;
  private lastTelemetryNitro: boolean | undefined;
  private intentionalDisconnect: boolean = false;
  private resumeRoom: { roomId: string; nickname: string; vehicleId: string } | null = null;

  /**
   * Dedicated zero-GC ring buffer per remote peer ID.
   */
  public readonly entityBuffers: Map<string, SnapshotRingBuffer> = new Map();

  /**
   * Retrieves or initializes the SnapshotRingBuffer for a given remote entity.
   */
  public getEntityBuffer(playerId: string): SnapshotRingBuffer {
    let buf = this.entityBuffers.get(playerId);
    if (!buf) {
      buf = new SnapshotRingBuffer();
      this.entityBuffers.set(playerId, buf);
    }
    return buf;
  }

  /**
   * Connects to the multiplayer relay server.
   */
  public connect(endpoint?: string): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.intentionalDisconnect = false;
    const rawEndpoint = endpoint || getWebSocketEndpoint();
    const separator = rawEndpoint.includes('?') ? '&' : '?';
    this.endpoint = rawEndpoint.includes('v=')
      ? rawEndpoint
      : `${rawEndpoint}${separator}v=${encodeURIComponent(GAME_VERSION)}`;

    const store = useMultiplayerStore.getState();
    store.setStatus('connecting');
    store.setError(null);

    try {
      const socket = new WebSocket(this.endpoint);
      this.ws = socket;
      // Late events from a previous socket must never clear its replacement.
      socket.onopen = () => { if (this.ws === socket) this.handleOpen(); };
      socket.onmessage = (event) => { if (this.ws === socket) this.handleMessage(event); };
      socket.onerror = (event) => { if (this.ws === socket) this.handleError(event); };
      socket.onclose = (event) => { if (this.ws === socket) this.handleClose(event); };
    } catch (err) {
      console.warn('[NetworkClient] Connection creation error:', err);
      store.setStatus('error');
      store.setError('Failed to establish connection');
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnects cleanly and clears intervals and buffers.
   */
  public disconnect(): void {
    this.intentionalDisconnect = true;
    this.resumeRoom = null;
    this.clearTimers();

    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          const leaveMsg: ClientMessage = { type: 'leave_lobby' };
          this.ws.send(JSON.stringify(leaveMsg));
          this.ws.close(1000, 'User left');
        } else {
          this.ws.close();
        }
      } catch {
        // Suppress
      }
      this.ws = null;
    }

    this.entityBuffers.clear();
    this.sendQueue.length = 0;
    this.lastTelemetryNitro = undefined;
    useMultiplayerStore.getState().reset();
  }

  /**
   * Requests latest rooms directory from server.
   */
  public requestRooms(): void {
    const msg: ClientMessage = {
      type: 'request_rooms',
    };
    this.send(msg);
  }

  /**
   * Creates a new multiplayer room and joins as host.
   */
  public createRoom(
    name: string,
    nickname: string,
    vehicleId: string,
    levelId: string = 'level1_island',
    gameMode: GameMode = 'freeroam'
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    }
    const msg: ClientMessage = {
      type: 'create_room',
      name,
      nickname,
      vehicleId,
      levelId,
      gameMode,
    };
    this.send(msg);
  }

  /**
   * Joins an existing room by its unique ID.
   */
  public joinRoom(roomId: string, nickname: string, vehicleId: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    }
    const msg: ClientMessage = {
      type: 'join_room',
      roomId,
      nickname,
      vehicleId,
    };
    this.send(msg);
  }

  /**
   * Deletes a room (host only).
   */
  public deleteRoom(roomId: string): void {
    const msg: ClientMessage = {
      type: 'delete_room',
      roomId,
    };
    this.send(msg);
  }

  /**
   * Leaves the current room and returns to lobby.
   */
  public leaveRoom(roomId: string): void {
    this.resumeRoom = null;
    const msg: ClientMessage = {
      type: 'leave_room',
      roomId,
    };
    this.send(msg);
    useMultiplayerStore.getState().setCurrentRoom(null);
    useMultiplayerStore.getState().setPlayers([]);
    this.entityBuffers.clear();
    this.requestRooms();
  }

  /**
   * Sends join_lobby request once socket is open (legacy wrapper).
   */
  public joinLobby(nickname: string, vehicleId: string, _levelId: string = 'level5_gymkhana'): void {
    this.joinRoom('gymkhana_freeroam', nickname, vehicleId);
  }

  /**
   * Checks whether the network client is connected and ready to transmit a new telemetry frame.
   */
  public canSendTelemetry(now: number = performance.now(),nitroActive?:boolean): boolean {
    const nitroEdge=nitroActive!==undefined&&this.lastTelemetryNitro!==undefined&&nitroActive!==this.lastTelemetryNitro;
    return !!this.ws && canSendTransient(this.ws.readyState,this.ws.bufferedAmount??0) && (nitroEdge||now-this.lastTelemetrySendTime+0.001>=TELEMETRY_SEND_INTERVAL_MS);
  }

  /**
   * Throttled telemetry transmission called from useVehiclePhysics / useFrame (20Hz, with immediate NOS edges).
   */
  public sendTelemetry(payload: Omit<VehicleTelemetryPayload, 'seq' | 'time'>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const now = performance.now();
    if (!this.canSendTelemetry(now,payload.nitroActive===true)) return;
    this.lastTelemetrySendTime = now;
    this.lastTelemetryNitro = payload.nitroActive===true;

    compactTelemetry(payload);

    const fullPayload: VehicleTelemetryPayload = {
      ...payload,
      seq: ++this.sequence,
      time: Date.now(),
    };

    const msg: ClientMessage = {
      type: 'telemetry',
      payload: fullPayload,
    };
    this.send(msg);
  }

  /** The server validates host authority and deduplicates ballot messages. */
  public startRoomRace(): void { this.send({type: 'race_start'}); }
  public resetRoomRace(): void { this.send({type: 'race_reset'}); }
  public voteRoomRace(voted: boolean): void { this.send({type: 'race_vote', voted}); }

  public sendClientReady(): void {
    this.send({ type: 'client_ready' });
  }

  public sendTagTouch(targetPlayerId: string): void {
    this.send({ type: 'tag_touch', targetPlayerId });
  }

  private sendQueue: ClientMessage[] = [];

  private send(msg: ClientMessage): void {
    // Replaying old positions or heartbeat timestamps after reconnect causes rubber-banding.
    if ((msg.type === 'telemetry' || msg.type === 'ping') && (!this.ws || !canSendTransient(this.ws.readyState, this.ws.bufferedAmount ?? 0))) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(msg));
      } catch (err) {
        console.warn('[NetworkClient] Send failed:', err);
      }
    } else {
      // The lobby polls while offline. Keep one pending directory request, not hours of them.
      if (msg.type === 'request_rooms' && this.sendQueue.some(item => item.type === 'request_rooms')) return;
      if (this.sendQueue.length >= 32) this.sendQueue.shift();
      this.sendQueue.push(msg);
    }
  }

  private handleOpen = (): void => {
    this.reconnectAttempts = 0;
    useMultiplayerStore.getState().setStatus('in_lobby');
    if (this.resumeRoom) {
      const { roomId, nickname, vehicleId } = this.resumeRoom;
      this.send({ type: 'join_room', roomId, nickname, vehicleId });
    }

    // Flush any queued client messages upon connection
    while (this.sendQueue.length > 0) {
      const queuedMsg = this.sendQueue.shift();
      if (queuedMsg && this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify(queuedMsg));
        } catch {
          // Ignore
        }
      }
    }

    // Immediately fetch active rooms list
    this.requestRooms();

    // Start heartbeat ping
    this.startPingHeartbeat();
  };

  public handleMessage = (event: MessageEvent): void => {
    try {
      const raw = JSON.parse(event.data);
      const msg: ServerMessage | null = parseServerMessage(raw);
      if (!msg) return;

      const store = useMultiplayerStore.getState();

      switch (msg.type) {
        case 'race_round': {
          if(store.currentRoom?.id===msg.roomId)store.setRaceRound(msg.state);
          break;
        }
        case 'rooms_list': {
          store.setRooms(msg.rooms);
          const currentId = store.currentRoom?.id;
          const updated = msg.rooms.find(room => room.id === currentId);
          if (updated) store.setCurrentRoom(updated);
          break;
        }

        case 'race_state': {
          if (store.currentRoom?.id !== msg.roomId) break;
          store.setCurrentRoom({...store.currentRoom, hostId: msg.hostId, hostNickname: msg.hostNickname});
          if (store.ping === 0) store.updateServerClockOffset(msg.serverTime - Date.now());
          store.setRaceStart(msg.state);
          break;
        }

        case 'room_created': {
          store.setCurrentRoom(msg.room);
          if (msg.room.levelId && useGameStore.getState().selectedLevelId !== msg.room.levelId) {
            useGameStore.getState().setSelectedLevelId(msg.room.levelId);
          }
          if (msg.room.gameMode) {
            useGameStore.getState().setGameMode(msg.room.gameMode);
          }
          break;
        }

        case 'room_joined': {
          this.resumeRoom = { roomId: msg.room.id, nickname: store.nickname,
            vehicleId: useGameStore.getState().selectedVehicleId };
          // Adopt the actual map before publishing membership/readiness. Rejoining an already loaded
          // map must not clear its scene-ready flag; a different map must finish loading before READY.
          if (msg.room.levelId && useGameStore.getState().selectedLevelId !== msg.room.levelId) {
            useGameStore.getState().setSelectedLevelId(msg.room.levelId);
          }
          if (msg.room.gameMode) useGameStore.getState().setGameMode(msg.room.gameMode);
          store.setSelfId(msg.selfId, msg.room.name, 0, msg.room);
          store.setPlayers(msg.players);
          store.setRaceStart(null);
          if (isDriveReady(useGameStore.getState())) this.sendClientReady();
          break;
        }

        case 'room_deleted': {
          this.resumeRoom = null;
          store.setCurrentRoom(null);
          store.setError(`Room closed: ${msg.reason}`);
          store.setPlayers([]);
          this.entityBuffers.clear();
          this.requestRooms();
          break;
        }

        case 'lobby_joined': {
          store.setSelfId(msg.selfId, msg.room);
          store.setPlayers(msg.players);
          break;
        }

        case 'player_joined': {
          store.addPlayer(msg.player);
          break;
        }

        case 'player_left': {
          store.removePlayer(msg.playerId);
          useDriftClubStore.getState().removeRemoteScore(msg.playerId);
          this.entityBuffers.delete(msg.playerId);
          break;
        }

        case 'world_snapshot': {
          const entities = msg.entities;
          const receiveTime = Date.now();
          for (const entityId in entities) {
            if (entityId === store.selfId) continue;
            const snap = entities[entityId];
            if (store.currentRoom?.gameMode === 'freeroam' && snap.score !== undefined) useDriftClubStore.getState().setRemoteScore(entityId,snap.score);
            // Normalize snapshot time to local arrival timeline to prevent client clock skew
            snap.time = receiveTime;
            const buffer = this.getEntityBuffer(entityId);
            buffer.push(snap);
          }
          break;
        }

        case 'pong': {
          const rtt = performance.now() - msg.clientTime;
          store.updatePing(Math.max(1, Math.round(rtt)));
          // Synchronize clock offset between server epoch time and local Date.now()
          const estimatedServerEpoch = msg.serverTime + rtt / 2;
          const clockOffset = Math.round(estimatedServerEpoch - Date.now());
          store.updateServerClockOffset(clockOffset);
          break;
        }

        case 'gymkhana_spectate': {
          store.setSpectating(
            msg.isSpectator,
            msg.targetId,
            msg.targetNickname,
            msg.roundTimeRemaining
          );
          break;
        }

        case 'gymkhana_round_ended': {
          store.setGymkhanaRoundEnded(msg.intermissionRemaining, msg.leaderboard);
          useGymkhanaStore.setState({
            showResultsModal: true,
            status: 'completed',
          });
          break;
        }

        case 'gymkhana_round_start': {
          store.setGymkhanaRoundStart();
          useGymkhanaStore.getState().dismissResultsModal();
          useGymkhanaStore.getState().resetBlitz();
          useGymkhanaStore.getState().startCountdown();
          useGameStore.getState().triggerReset(true);
          break;
        }

        case 'tag_match_countdown': {
          useTagStore.getState().setCountdown(msg.countdown, msg.assignedSpawnIndex);
          break;
        }

        case 'tag_match_start': {
          useTagStore.getState().startMatch(msg.roundDuration, msg.taggerId, msg.assignedSpawnIndex);
          useGameStore.getState().triggerReset(true);
          break;
        }

        case 'tag_passed': {
          useTagStore.getState().setTagPassed(msg.oldTaggerId, msg.newTaggerId, msg.freezeDurationMs);
          break;
        }

        case 'tag_match_ended': {
          useTagStore.getState().endMatch(msg.intermissionRemaining, msg.leaderboard);
          break;
        }

        case 'tag_spectate': {
          store.setSpectating(
            msg.isSpectator,
            msg.targetId,
            msg.targetNickname,
            msg.roundTimeRemaining
          );
          if (typeof msg.roundTimeRemaining === 'number') {
            useTagStore.setState({ roundRemaining: msg.roundTimeRemaining });
          }
          break;
        }

        case 'version_mismatch': {
          console.warn(
            `[NetworkClient] Version mismatch detected: server=${msg.serverVersion}, client=${msg.clientVersion}`
          );
          store.setStatus('version_mismatch');
          store.setVersionMismatch({
            serverVersion: msg.serverVersion,
            clientVersion: msg.clientVersion,
          });
          store.setError(msg.message);
          this.intentionalDisconnect = true;
          if (this.ws) {
            try {
              this.ws.close(4003, 'VERSION_MISMATCH');
            } catch {
              // Suppress
            }
            this.ws = null;
          }
          break;
        }

        case 'error': {
          store.setError(`${msg.code}: ${msg.message}`);
          break;
        }
      }
    } catch (err) {
      console.warn('[NetworkClient] Message decode error:', err);
    }
  };

  private handleError = (event: Event): void => {
    console.warn('[NetworkClient] WebSocket error event:', event);
  };

  private handleClose = (event: CloseEvent): void => {
    console.log('[NetworkClient] WebSocket closed:', event.code, event.reason);
    this.clearTimers();
    this.ws = null;

    if (this.intentionalDisconnect) {
      return;
    }

    const store = useMultiplayerStore.getState();
    if (event.code === 4003 || store.status === 'version_mismatch') {
      console.warn('[NetworkClient] WebSocket closed with VERSION_MISMATCH (code 4003). Suppressing auto-reconnect.');
      store.setStatus('version_mismatch');
      this.intentionalDisconnect = true;
      return;
    }

    store.setStatus('reconnecting');
    this.scheduleReconnect();
  };

  private scheduleReconnect(): void {
    if (this.intentionalDisconnect || useMultiplayerStore.getState().status === 'version_mismatch') return;
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      const store = useMultiplayerStore.getState();
      store.setStatus('disconnected');
      store.setError('Connection lost. Please rejoin lobby.');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(10000, 1000 * Math.pow(2, this.reconnectAttempts - 1));

    if (this.reconnectTimeoutId !== null) {
      window.clearTimeout(this.reconnectTimeoutId);
    }

    this.reconnectTimeoutId = window.setTimeout(() => {
      this.reconnectTimeoutId = null;
      this.connect(this.endpoint);
    }, delay);
  }

  private startPingHeartbeat(): void {
    if (this.pingIntervalId !== null) {
      window.clearInterval(this.pingIntervalId);
    }

    this.pingIntervalId = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const pingMsg: ClientMessage = {
          type: 'ping',
          clientTime: performance.now(),
        };
        this.send(pingMsg);
      }
    }, PING_INTERVAL_MS);
  }

  private clearTimers(): void {
    if (this.pingIntervalId !== null) {
      window.clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
    if (this.reconnectTimeoutId !== null) {
      window.clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }
}

/**
 * Global singleton network client instance.
 */
export const networkClient = new NetworkClient();
