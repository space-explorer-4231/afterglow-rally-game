import { getLevelPreset } from '@/config/levelRegistry';
import { getGameModeDefinition } from '@/config/gameModeRegistry';
import type { RoomSummary } from '@/types/network';
import { ClubTrackMap } from './ClubTrackMap';
import { STAGE_BANNERS } from './HeroShowcase';
import { getRoomJoinAvailability } from './roomJoinAvailability';

interface MultiplayerRoomCardProps {
  room: RoomSummary;
  canDelete: boolean;
  joinFocused: boolean;
  deleteFocused: boolean;
  updateRequired: boolean;
  joining: boolean;
  deleteArmed: boolean;
  onJoin: () => void;
  onDelete: () => void;
  onFocusJoin: () => void;
  onFocusDelete: () => void;
}

/** A shrink-safe room card whose primary action stays visible without hover. */
export function MultiplayerRoomCard({
  room, canDelete, joinFocused, deleteFocused, updateRequired, joining,
  deleteArmed, onJoin, onDelete, onFocusJoin, onFocusDelete,
}: MultiplayerRoomCardProps) {
  const level = getLevelPreset(room.levelId);
  const mode = getGameModeDefinition(room.gameMode);
  const availability = getRoomJoinAvailability(room, updateRequired, joining);
  return (
    <article className="club-room-card" aria-label={`${room.name}, ${mode.name}`}>
      <div className="club-room-destination">
        <img src={level.bannerUrl || STAGE_BANNERS[level.id] || '/images/stages/island_circuit.jpg'} alt="" loading="lazy" />
        <ClubTrackMap level={level} />
        <span>{level.name}</span>
      </div>
      <div className="club-room-details">
        <h3>{room.name}</h3>
        <p className="club-room-mode">{room.isPersistent ? 'Open community room' : 'Friends’ room'} · {mode.name}</p>
        {!room.isPersistent && <p className="club-room-code">Room code <strong>{room.id}</strong></p>}
        <p className="club-room-meta">{room.playerCount}/{room.maxPlayers} drivers · Host: {room.hostNickname}</p>
        {availability.reason && <p className="club-room-reason">{availability.reason}</p>}
      </div>
      <div className="club-room-actions">
        <button
          type="button"
          className="club-room-join"
          disabled={availability.disabled}
          aria-label={`${availability.label}: ${room.name}`}
          data-gamepad-focused={joinFocused ? 'true' : undefined}
          onClick={onJoin}
          onFocus={onFocusJoin}
          onPointerMove={onFocusJoin}
        >{availability.label}</button>
        {canDelete && (
          <button
            type="button"
            className="club-room-delete"
            disabled={joining}
            aria-label={`${deleteArmed ? 'Confirm delete' : 'Delete'} room: ${room.name}`}
            data-gamepad-focused={deleteFocused ? 'true' : undefined}
            onClick={onDelete}
            onFocus={onFocusDelete}
            onPointerMove={onFocusDelete}
          >{deleteArmed ? 'Confirm delete' : 'Delete room'}</button>
        )}
      </div>
      {deleteArmed && <p className="club-room-confirmation" role="status">Press delete again within 5 seconds to confirm. Escape / B cancels.</p>}
    </article>
  );
}
