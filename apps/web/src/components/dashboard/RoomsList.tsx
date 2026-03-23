import { RoomCard } from "./RoomCard";
import { Room, User } from "./dashboard.types";

interface RoomsListProps {
  rooms: Room[];
  user: User | null;
  overviewRoomId: string | null;
  expandedRoom: string | null;
  actionLoading: string | null;
  shareDialogOpen: string | null;
  onlineMembers?: string[];
  onJoinRoomInSocket: (roomId: string | null) => void;
  onToggleExpansion: (roomId: string) => void;
  onShareRoom: (roomId: string) => void;
  onUnshareRoom: (roomId: string) => void;
  onDeleteRoom: (roomId: string) => void;
  onLeaveRoom: (roomId: string, roomName: string, isOwner: boolean) => void;
  onCopyShareLink: (roomId: string) => void;
  onCopyRoomId: (roomId: string) => void;
  canManageRoom: (room: Room) => boolean;
  isOwner: (room: Room) => boolean;
}

export const RoomsList = ({
  rooms,
  user,
  overviewRoomId,
  expandedRoom,
  actionLoading,
  shareDialogOpen,
  onlineMembers,
  onJoinRoomInSocket,
  onToggleExpansion,
  onShareRoom,
  onUnshareRoom,
  onDeleteRoom,
  onLeaveRoom,
  onCopyShareLink,
  onCopyRoomId,
  canManageRoom,
  isOwner,
}: RoomsListProps) => {
  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Your Rooms <span className="text-muted-foreground text-lg font-normal ml-1">({rooms.length})</span></h2>
          <p className="text-sm text-muted-foreground mt-1">Manage and access your drawing sessions</p>
        </div>
      </div>
      
      {rooms.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-card/30 rounded-2xl border border-dashed shadow-sm">
          <p className="text-muted-foreground font-medium text-lg mb-2">
            No rooms yet.
          </p>
          <p className="text-sm text-muted-foreground max-w-sm">Create a new room or join an existing one using a room ID from the sidebar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 pb-6">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              user={user}
              isExpanded={expandedRoom === room.id}
              isSelected={overviewRoomId === room.id}
              actionLoading={actionLoading}
              shareDialogOpen={shareDialogOpen}
              onlineMembers={overviewRoomId === room.id ? (onlineMembers || []) : []}
              onToggleExpansion={onToggleExpansion}
              onJoinRoomInSocket={onJoinRoomInSocket}
              onShareRoom={onShareRoom}
              onUnshareRoom={onUnshareRoom}
              onDeleteRoom={onDeleteRoom}
              onLeaveRoom={onLeaveRoom}
              onCopyShareLink={onCopyShareLink}
              onCopyRoomId={onCopyRoomId}
              canManageRoom={canManageRoom}
              isOwner={isOwner}
            />
          ))}
        </div>
      )}
    </div>
  );
};
