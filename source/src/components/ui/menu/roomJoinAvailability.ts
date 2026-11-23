import type { RoomSummary } from '@/types/network';

/** User-visible eligibility for a room action, shared by pointer and controller paths. */
export interface RoomJoinAvailability {
  disabled: boolean;
  label: string;
  reason: string;
}

/** Capacity and in-flight joins must be checked before changing the selected map. */
export function getRoomJoinAvailability(
  room: Pick<RoomSummary, 'playerCount' | 'maxPlayers'>,
  updateRequired: boolean,
  joining: boolean,
): RoomJoinAvailability {
  if (updateRequired) return { disabled: true, label: 'Update required', reason: 'Reload the game to join this server.' };
  if (joining) return { disabled: true, label: 'Connecting…', reason: 'A room connection is already in progress.' };
  if (room.playerCount >= room.maxPlayers) return { disabled: true, label: 'Room full', reason: 'This room is full. Choose another room or create one.' };
  return { disabled: false, label: 'Join room', reason: '' };
}
