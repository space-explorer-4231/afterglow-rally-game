import type { RoomSummary } from '@/types/network';

/** Virtual room focus must follow identity while the live room list is refreshed. */
export type RoomActionFocus = { area: 'room_join' | 'room_delete'; index: number };

/** Preserve a selected room through reorder/removal without confirming a different room. */
export function reconcileRoomActionFocus(
  focus: RoomActionFocus,
  previousRooms: readonly RoomSummary[],
  rooms: readonly RoomSummary[],
  selfId: string | null,
): RoomActionFocus | { area: 'create_toggle' } {
  const previousRoom = previousRooms[focus.index];
  const index = previousRoom ? rooms.findIndex(room => room.id === previousRoom.id) : -1;
  if (index < 0) return { area: 'create_toggle' };
  const room = rooms[index];
  const canDelete = selfId !== null && room.hostId === selfId && !room.isPersistent;
  return { area: focus.area === 'room_delete' && !canDelete ? 'room_join' : focus.area, index };
}
