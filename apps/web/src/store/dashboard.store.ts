import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Room, Member, User } from "@/components/dashboard/dashboard.types";

interface DashboardState {
  joinedRooms: Room[];
  overviewRoomId: string | null;
  members: Member[];
  loading: boolean;
  actionLoading: string | null;
  shareDialogOpen: string | null;
  expandedRoom: string | null;
  error: string | null;
}

interface DashboardActions {
  fetchJoinedRooms: () => Promise<void>;
  fetchRoomData: (roomId: string) => Promise<void>;
  createRoom: (name: string) => Promise<void>;
  joinRoom: (roomId: string) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
  leaveRoom: (
    roomId: string,
    roomName: string,
    isOwner: boolean,
  ) => Promise<void>;
  shareRoom: (roomId: string) => Promise<void>;
  unshareRoom: (roomId: string) => Promise<void>;
  copyShareLink: (roomId: string) => void;
  copyRoomId: (roomId: string) => void;
  openOverview: (roomId: string | null) => void;
  closeOverview: () => void;
  toggleRoomExpansion: (roomId: string) => void;
  setShareDialogOpen: (roomId: string | null) => void;
  promoteToAdmin: (roomId: string, userId: string) => Promise<void>;
  demoteFromAdmin: (roomId: string, userId: string) => Promise<void>;
  kickMember: (roomId: string, userId: string) => Promise<void>;
  canManageRoom: (room: Room, user: User | null) => boolean;
  isOwner: (room: Room, user: User | null) => boolean;
  canManageMembers: (room: Room, user: User | null) => boolean;
  getOverviewRoom: () => Room | undefined;
}

interface DashboardStore extends DashboardState, DashboardActions {}

export const useDashboardStore = create<DashboardStore>()(
  devtools(
    (set, get) => ({
      joinedRooms: [],
      overviewRoomId: null,
      members: [],
      loading: false,
      actionLoading: null,
      shareDialogOpen: null,
      expandedRoom: null,
      error: null,

      fetchJoinedRooms: async () => {
        try {
          set({ loading: true, error: null });
          const response = await fetch("/api/rooms", {
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            set({ joinedRooms: data.rooms || [], loading: false });
          } else {
            throw new Error("Failed to fetch rooms");
          }
        } catch (err: any) {
          const errorMessage = err.message || "Failed to fetch rooms";
          set({ error: errorMessage, loading: false });
          throw err;
        }
      },

      fetchRoomData: async (roomId: string) => {
        try {
          set({ loading: true, error: null });
          const membersRes = await fetch(`/api/rooms/${roomId}/members`, { credentials: "include" });

          if (membersRes.ok) {
            const membersData = await membersRes.json();
            set({
              members: membersData.members || [],
              loading: false,
            });
          } else {
            throw new Error("Failed to fetch room data");
          }
        } catch (err: any) {
          const errorMessage = err.message || "Failed to fetch room data";
          set({ error: errorMessage, loading: false });
          throw err;
        }
      },

      createRoom: async (name: string) => {
        if (!name.trim()) return;

        try {
          set({ actionLoading: "create", error: null });
          const response = await fetch("/api/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name.trim() }),
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            const newRoom = {
              id: data.room.id,
              name: data.room.name,
              createdAt: data.room.created_at,
              updatedAt: data.room.updated_at,
              isShared: data.room.is_shared || false,
              ownerId: data.room.owner_id,
              userRole: "ADMIN",
              owner: data.room.owner,
              memberCount: 1,
              shapeCount: 0,
              messageCount: 0,
            };
            set((state) => ({
              joinedRooms: [newRoom as Room, ...state.joinedRooms],
              actionLoading: null,
            }));
          } else {
            const error = await response.json();
            throw new Error(error.error || "Failed to create room");
          }
        } catch (err: any) {
          const errorMessage = err.message || "Failed to create room";
          set({ error: errorMessage, actionLoading: null });
          throw err;
        }
      },

      joinRoom: async (roomId: string) => {
        if (!roomId.trim()) return;

        try {
          set({ actionLoading: "join", error: null });
          const response = await fetch(`/api/rooms/${roomId.trim()}/join`, {
            method: "POST",
            credentials: "include",
          });

          if (response.ok) {
            // Fetch full room list since we need full room data
            await get().fetchJoinedRooms();
            set({ actionLoading: null });
          } else {
            const error = await response.json();
            throw new Error(error.error || "Failed to join room");
          }
        } catch (err: any) {
          const errorMessage = err.message || "Failed to join room";
          set({ error: errorMessage, actionLoading: null });
          throw err;
        }
      },

      deleteRoom: async (roomId: string) => {
        try {
          set({ actionLoading: `delete-${roomId}`, error: null });
          const response = await fetch(`/api/rooms/${roomId}`, {
            method: "DELETE",
            credentials: "include",
          });

          if (response.ok) {
            set((state) => ({
              joinedRooms: state.joinedRooms.filter((r) => r.id !== roomId),
              overviewRoomId: state.overviewRoomId === roomId ? null : state.overviewRoomId,
              actionLoading: null,
            }));
          } else {
            const error = await response.json();
            throw new Error(error.error || "Failed to delete room");
          }
        } catch (err: any) {
          const errorMessage = err.message || "Failed to delete room";
          set({ error: errorMessage, actionLoading: null });
          throw err;
        }
      },

      leaveRoom: async (roomId: string, roomName: string, isOwner: boolean) => {
        try {
          set({ actionLoading: `leave-${roomId}`, error: null });
          const response = await fetch(`/api/rooms/${roomId}/leave`, {
            method: "DELETE",
            credentials: "include",
          });

          if (response.ok) {
            set((state) => ({
              joinedRooms: state.joinedRooms.filter((r) => r.id !== roomId),
              overviewRoomId: state.overviewRoomId === roomId ? null : state.overviewRoomId,
              actionLoading: null,
            }));
          } else {
            const error = await response.json();
            throw new Error(error.error || "Failed to leave room");
          }
        } catch (err: any) {
          const errorMessage = err.message || "Failed to leave room";
          set({ error: errorMessage, actionLoading: null });
          throw err;
        }
      },

      shareRoom: async (roomId: string) => {
        try {
          set({ actionLoading: `share-${roomId}`, error: null });
          const response = await fetch(`/api/rooms/${roomId}/share`, {
            method: "PATCH",
            credentials: "include",
          });

          if (response.ok) {
            set((state) => ({
              joinedRooms: state.joinedRooms.map((r) =>
                r.id === roomId ? { ...r, isShared: true } : r
              ),
              shareDialogOpen: roomId,
              actionLoading: null,
            }));
          } else {
            const error = await response.json();
            throw new Error(error.error || "Failed to share room");
          }
        } catch (err: any) {
          const errorMessage = err.message || "Failed to share room";
          set({ error: errorMessage, actionLoading: null });
          throw err;
        }
      },

      unshareRoom: async (roomId: string) => {
        try {
          set({ actionLoading: `unshare-${roomId}`, error: null });
          const response = await fetch(`/api/rooms/${roomId}/unshare`, {
            method: "PATCH",
            credentials: "include",
          });

          if (response.ok) {
            set((state) => ({
              joinedRooms: state.joinedRooms.map((r) =>
                r.id === roomId ? { ...r, isShared: false } : r
              ),
              actionLoading: null,
            }));
          } else {
            const error = await response.json();
            throw new Error(error.error || "Failed to unshare room");
          }
        } catch (err: any) {
          const errorMessage = err.message || "Failed to unshare room";
          set({ error: errorMessage, actionLoading: null });
          throw err;
        }
      },

      copyShareLink: (roomId: string) => {
        const shareLink = `${window.location.origin}/join/room/${roomId}`;
        navigator.clipboard
          .writeText(shareLink)
          .then(() => {
            // Success handled by notification store
          })
          .catch(() => {
            const textArea = document.createElement("textarea");
            textArea.value = shareLink;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            // Success handled by notification store
          });
      },

      copyRoomId: (roomId: string) => {
        const roomIdText = roomId.toString();
        navigator.clipboard
          .writeText(roomIdText)
          .then(() => {
            // Success handled by notification store
          })
          .catch(() => {
            const textArea = document.createElement("textarea");
            textArea.value = roomIdText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            // Success handled by notification store
          });
      },
      openOverview: (roomId: string | null) => {
        set({ overviewRoomId: roomId });

        if (roomId) {
          get().fetchRoomData(roomId);
        }
      },

      closeOverview: () => {
        set({ overviewRoomId: null });
      },

      toggleRoomExpansion: (roomId: string) => {
        const { expandedRoom } = get();
        set({ expandedRoom: expandedRoom === roomId ? null : roomId });
      },

      setShareDialogOpen: (roomId: string | null) => {
        set({ shareDialogOpen: roomId });
      },

      promoteToAdmin: async (roomId: string, userId: string) => {
        try {
          set({ actionLoading: `promote-${userId}`, error: null });
          const response = await fetch(
            `/api/rooms/${roomId}/members/${userId}/promote`,
            {
              method: "PATCH",
              credentials: "include",
            },
          );

          if (response.ok) {
            await get().fetchRoomData(roomId);
            set({ actionLoading: null });
          } else {
            const error = await response.json();
            throw new Error(error.error || "Failed to promote member");
          }
        } catch (err: any) {
          const errorMessage = err.message || "Failed to promote member";
          set({ error: errorMessage, actionLoading: null });
          throw err;
        }
      },

      demoteFromAdmin: async (roomId: string, userId: string) => {
        try {
          set({ actionLoading: `demote-${userId}`, error: null });
          const response = await fetch(
            `/api/rooms/${roomId}/members/${userId}/demote`,
            {
              method: "PATCH",
              credentials: "include",
            },
          );

          if (response.ok) {
            await get().fetchRoomData(roomId);
            set({ actionLoading: null });
          } else {
            const error = await response.json();
            throw new Error(error.error || "Failed to demote admin");
          }
        } catch (err: any) {
          const errorMessage = err.message || "Failed to demote admin";
          set({ error: errorMessage, actionLoading: null });
          throw err;
        }
      },

      kickMember: async (roomId: string, userId: string) => {
        try {
          set({ actionLoading: `kick-${userId}`, error: null });
          const response = await fetch(
            `/api/rooms/${roomId}/members/${userId}`,
            {
              method: "DELETE",
              credentials: "include",
            },
          );

          if (response.ok) {
            await get().fetchRoomData(roomId);
            set({ actionLoading: null });
          } else {
            const error = await response.json();
            throw new Error(error.error || "Failed to kick member");
          }
        } catch (err: any) {
          const errorMessage = err.message || "Failed to kick member";
          set({ error: errorMessage, actionLoading: null });
          throw err;
        }
      },

      canManageRoom: (room: Room, user: User | null) => {
        return user?.id === room.owner.id || room.userRole === "ADMIN";
      },

      isOwner: (room: Room, user: User | null) => {
        return user?.id === room.owner.id;
      },

      canManageMembers: (room: Room, user: User | null) => {
        return user?.id === room.owner.id || room.userRole === "ADMIN";
      },

      getOverviewRoom: () => {
        const { joinedRooms, overviewRoomId } = get();
        return joinedRooms.find((room) => room.id === overviewRoomId);
      },
    }),
    {
      name: "dashboard-store",
    },
  ),
);