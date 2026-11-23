import {parseClientMessage} from './packetValidator.js';
import type {ClientMessage} from './types.js';
import type {RelaySocket} from './relaySocket.js';
import type {RoomManager} from './rooms/RoomManager.js';

/** Validate an incoming JSON packet before dispatch. Invalid shapes are ignored; malformed JSON throws to the transport's error boundary. */
export function handleClientPacket(roomManager:RoomManager,ws:RelaySocket,text:string):boolean {
  const raw:unknown=JSON.parse(text);
  const msg=parseClientMessage(raw);
  if(!msg)return false;
  dispatchClientMessage(roomManager,ws,msg);
  return true;
}

/** Route the validated protocol identically across Node and edge transports. */
export function dispatchClientMessage(roomManager:RoomManager,ws:RelaySocket,msg:ClientMessage):void {
  switch (msg.type) {
    case 'request_rooms': {
      roomManager.subscribeLobby(ws);
      break;
    }

    case 'create_room': {
      roomManager.createRoom(ws, msg.name, msg.nickname, msg.vehicleId, msg.levelId, msg.gameMode);
      break;
    }

    case 'join_room': {
      roomManager.joinRoom(ws, msg.roomId, msg.nickname, msg.vehicleId);
      break;
    }

    case 'delete_room': {
      const playerId = roomManager.getPlayerId(ws);
      if (playerId) {
        roomManager.deleteRoom(msg.roomId, playerId);
      }
      break;
    }

    case 'leave_room': {
      const playerId = roomManager.getPlayerId(ws);
      if (playerId) {
        roomManager.leavePlayer(playerId, 'user_left_room');
      }
      break;
    }

    case 'join_lobby': {
      // Backward compatibility for legacy join_lobby
      roomManager.joinRoom(ws, 'gymkhana_freeroam', msg.nickname, msg.vehicleId);
      break;
    }

    case 'leave_lobby': {
      const playerId = roomManager.getPlayerId(ws);
      if (playerId) {
        roomManager.leavePlayer(playerId, 'user_left_lobby');
      }
      break;
    }

    case 'telemetry': {
      roomManager.handleTelemetry(ws, msg.payload);
      break;
    }

    case 'ping': {
      roomManager.handlePing(ws, msg.clientTime);
      break;
    }

    case 'client_ready': {
      roomManager.handleClientReady(ws);
      break;
    }

    case 'race_start':
    case 'race_reset':
    case 'race_vote': {
      roomManager.handleRaceAction(ws, msg.type, msg.type === 'race_vote' && msg.voted);
      break;
    }

    case 'tag_touch': {
      roomManager.handleTagTouch(ws, msg.targetPlayerId);
      break;
    }
  }
}
