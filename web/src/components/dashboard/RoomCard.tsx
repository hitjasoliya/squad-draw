import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { OnlineIndicator } from "@/components/ui/OnlineIndicator";
import { Room, User } from "./dashboard.types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface RoomCardProps {
  room: Room;
  user: User | null;
  isExpanded: boolean;
  isSelected: boolean;
  actionLoading: string | null;
  onlineMembers: string[];
  onToggleExpansion: (roomId: string) => void;
  onJoinRoomInSocket: (roomId: string | null) => void;
  onShareRoom: (roomId: string) => void;
  onUnshareRoom: (roomId: string) => void;
  onDeleteRoom: (roomId: string) => void;
  onLeaveRoom: (roomId: string, roomName: string, isOwner: boolean) => void;
  onCopyShareLink: (roomId: string) => void;
  onCopyRoomId: (roomId: string) => void;
  canManageRoom: (room: Room) => boolean;
  isOwner: (room: Room) => boolean;
}

export const RoomCard = ({
  room,
  user,
  isExpanded,
  isSelected,
  actionLoading,
  onlineMembers,
  onToggleExpansion,
  onJoinRoomInSocket,
  onShareRoom,
  onUnshareRoom,
  onDeleteRoom,
  onLeaveRoom,
  onCopyShareLink,
  onCopyRoomId,
  canManageRoom,
  isOwner,
}: RoomCardProps) => {
  const router = useRouter();
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "delete" | "leave" | "leaveTransfer" | "share" | "unshare" | null;
    title: string;
    message: string;
    confirmText: string;
    variant: "default" | "danger";
  }>({
    isOpen: false,
    type: null,
    title: "",
    message: "",
    confirmText: "",
    variant: "default",
  });

  const handleDeleteRoom = () => {
    setModalState({
      isOpen: true,
      type: "delete",
      title: "Delete Room",
      message: `Are you sure you want to delete "${room.name}"? This action cannot be undone and all room data will be permanently lost.`,
      confirmText: "Delete Room",
      variant: "danger",
    });
  };

  const handleLeaveRoom = () => {
    setModalState({
      isOpen: true,
      type: "leave",
      title: "Leave Room",
      message: `Are you sure you want to leave "${room.name}"? You won't be able to rejoin unless invited again.`,
      confirmText: "Leave Room",
      variant: "default",
    });
  };

  const handleLeaveTransferRoom = () => {
    setModalState({
      isOpen: true,
      type: "leaveTransfer",
      title: "Leave & Transfer Ownership",
      message: `Are you sure you want to leave "${room.name}" and transfer ownership? The room will be transferred to another admin or the oldest member.`,
      confirmText: "Leave & Transfer",
      variant: "danger",
    });
  };

  const handleShareRoom = () => {
    setModalState({
      isOpen: true,
      type: "share",
      title: "Share Room",
      message: `Are you sure you want to share "${room.name}"? This will generate a shareable link that others can use to join the room.`,
      confirmText: "Share Room",
      variant: "default",
    });
  };

  const handleUnshareRoom = () => {
    setModalState({
      isOpen: true,
      type: "unshare",
      title: "Unshare Room",
      message: `Are you sure you want to unshare "${room.name}"? The current share link will stop working and others won't be able to join using it.`,
      confirmText: "Unshare Room",
      variant: "default",
    });
  };

  const handleConfirm = async () => {
    try {
      if (modalState.type === "delete") {
        await onDeleteRoom(room.id);
      } else if (modalState.type === "leave") {
        await onLeaveRoom(room.id, room.name, false);
      } else if (modalState.type === "leaveTransfer") {
        await onLeaveRoom(room.id, room.name, true);
      } else if (modalState.type === "share") {
        await onShareRoom(room.id);
      } else if (modalState.type === "unshare") {
        await onUnshareRoom(room.id);
      }
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };
  return (
    <div
      className={`rounded-2xl border transition-[border-color,box-shadow,background-color] duration-200 ease-out cursor-pointer ${
        isSelected
          ? "border-primary/80 bg-primary/10 shadow-md"
          : "border-border/70 bg-card/80 hover:bg-accent/40 hover:border-border hover:shadow-sm"
      } ${isExpanded ? "shadow-lg ring-1 ring-primary/20" : ""}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          return;
        }
        if (!isExpanded) {
          onToggleExpansion(room.id);
        }
        if (!isSelected) {
          onJoinRoomInSocket(room.id);
        }
      }}
    >
      {/* Header - Always Visible */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="text-muted-foreground transition-colors">
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-semibold truncate">{room.name}</h4>
              {isSelected && onlineMembers.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <OnlineIndicator isOnline={true} size="sm" />
                  <span>{onlineMembers.length} online</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {isOwner(room) && (
                <span className="text-xs px-2 py-0.5 bg-primary text-primary-foreground rounded-full font-medium">
                  Owner
                </span>
              )}
              {!isOwner(room) && room.userRole === "ADMIN" && (
                <span className="text-xs px-2 py-0.5 bg-primary/70 text-primary-foreground rounded-full font-medium">
                  Admin
                </span>
              )}
              {room.userRole === "MEMBER" && (
                <span className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full font-medium">
                  Member
                </span>
              )}
            </div>
          </div>
        </div>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            try {
              router.push(`/room/${room.id}`);
            } catch (error) {
              console.error("Error visiting room", error);
              toast.error("Error visiting room");
            }
          }}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm active:scale-95"
        >
          Visit Room
        </Button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border/50 animate-in slide-in-from-top-2 duration-200">
          <div className="pt-3 space-y-3">
            {/* Room Details */}
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Created: {new Date(room.createdAt).toLocaleString()}</p>
              <div className="flex items-center gap-2">
                <span>Shared:</span>
                {room.isShared ? (
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-primary-foreground text-xs font-bold">
                        ✓
                      </span>
                    </div>
                    <span className="ml-1 text-primary text-sm">Yes</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-muted-foreground flex items-center justify-center">
                      <span className="text-background text-xs font-bold">
                        ✕
                      </span>
                    </div>
                    <span className="ml-1 text-muted-foreground text-sm">
                      No
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div
              className="flex flex-wrap gap-2 justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-wrap gap-2">
                {/* Chat Status - Shows current state */}
                

                {/* Share/Unshare - Admin/Owner only */}
                {canManageRoom(room) && (
                  <Button
                    onClick={() =>
                      room.isShared ? handleUnshareRoom() : handleShareRoom()
                    }
                    disabled={
                      actionLoading === `share-${room.id}` ||
                      actionLoading === `unshare-${room.id}`
                    }
                    size="sm"
                    variant={room.isShared ? "secondary" : "default"}
                  >
                    {actionLoading === `share-${room.id}`
                      ? "Sharing..."
                      : actionLoading === `unshare-${room.id}`
                        ? "Unsharing..."
                        : room.isShared
                          ? "Unshare"
                          : "Share"}
                  </Button>
                )}
              </div>

              {/* Right side actions */}
              <div className="flex gap-2">
                {/* Delete - Owner only */}
                {isOwner(room) && (
                  <Button
                    onClick={handleDeleteRoom}
                    disabled={actionLoading === `delete-${room.id}`}
                    size="sm"
                    variant="destructive"
                  >
                    {actionLoading === `delete-${room.id}`
                      ? "Deleting..."
                      : "Delete"}
                  </Button>
                )}

                {/* Leave - Non-owners */}
                {!isOwner(room) && (
                  <Button
                    onClick={handleLeaveRoom}
                    disabled={actionLoading === `leave-${room.id}`}
                    size="sm"
                    variant="secondary"
                  >
                    {actionLoading === `leave-${room.id}`
                      ? "Leaving..."
                      : "Leave"}
                  </Button>
                )}

                {/* Leave for owners (transfers ownership) */}
                {isOwner(room) && (
                  <Button
                    onClick={handleLeaveTransferRoom}
                    disabled={actionLoading === `leave-${room.id}`}
                    size="sm"
                    variant="default"
                  >
                    {actionLoading === `leave-${room.id}`
                      ? "Leaving..."
                      : "Leave & Transfer"}
                  </Button>
                )}
              </div>
            </div>

            {/* Share Dialog */}
            {room.isShared && (
              <div
                className="mt-4 p-4 bg-muted border rounded-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <h5 className="text-sm font-semibold mb-3">Share this room:</h5>

                {/* Room ID Section */}
                <div className="mb-3">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Room ID:
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={room.id}
                      readOnly
                      className="flex-1 text-xs font-mono"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopyRoomId(room.id);
                      }}
                      size="sm"
                      variant="default"
                    >
                      Copy ID
                    </Button>
                  </div>
                </div>

                {/* Share Link Section */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Share Link:
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={`${window.location.origin}/join/room/${room.id}`}
                      readOnly
                      className="flex-1 text-xs font-mono"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopyShareLink(room.id);
                      }}
                      size="sm"
                      variant="default"
                    >
                      Copy Link
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        variant={modalState.variant}
        onConfirm={handleConfirm}
      />
    </div>
  );
};
