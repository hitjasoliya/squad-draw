import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Message, User } from "@/components/dashboard/dashboard.types";
import { io, Socket } from "socket.io-client";
import { Shape, ShapeType } from "@/schemas/index";

const getWebSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_WEBSOCKET_URL) {
    return process.env.NEXT_PUBLIC_WEBSOCKET_URL;
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${host}:8080`;
  }
  return "http://localhost:8080";
};

export interface OnlineMember {
  id: string;
  name: string;
}

export interface RemoteCursor {
  userId: string;
  x: number;
  y: number;
  userName: string;
  color: string;
}

interface RoomState {
  socket: Socket | null;
  socketRoomId: string | null;
  messages: Message[];
  error: string | null;
  isConnected: boolean;
  onlineMembers: OnlineMember[];
  shapes: Shape[];
  cursors: Record<string, RemoteCursor>;
}

interface RoomActions {
  sendMessage: (message: string, user?: User) => Promise<void>;
  joinRoomInSocket: (roomId: string | null) => void;
  initializeSocket: () => void;
  disconnectSocket: () => void;
  addShape: (shape: Shape, userId?: string) => void;
  clearShapes: () => Promise<void>;
  fetchShapes: (roomId: string) => Promise<void>;
  saveAndBroadcastShape: (shape: Shape, userId: string) => Promise<void>;
  fetchMessages: (roomId: string) => Promise<void>;
  sendCursorPosition: (x: number, y: number) => void;
}

interface RoomStore extends RoomState, RoomActions {}

export const useRoomStore = create<RoomStore>()(
  devtools(
    (set, get) => ({
      socket: null,
      socketRoomId: null,
      messages: [],
      error: null,
      isConnected: false,
      onlineMembers: [],
      shapes: [],
      cursors: {},

      fetchMessages: async (roomId: string) => {
        try {
          const response = await fetch(`/api/rooms/${roomId}/messages`, {
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            set({ messages: data.messages || [] });
          } else {
            throw new Error("Failed to fetch messages");
          }
        } catch (err: unknown) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to fetch messages";
          set({ error: errorMessage });
          throw err;
        }
      },

      sendMessage: async (message: string, user?: User) => {
        const { socketRoomId, socket, isConnected } = get();

        if (!message || typeof message !== "string") {
          set({ error: "Invalid message format" });
          return;
        }

        const trimmedMessage = message.trim();

        if (!trimmedMessage) {
          set({ error: "Message cannot be empty" });
          return;
        }

        if (trimmedMessage.length > 1000) {
          set({ error: "Message cannot exceed 1000 characters" });
          return;
        }

        if (!socketRoomId || typeof socketRoomId !== "string") {
          set({ error: "No room selected for messaging" });
          return;
        }

        if (!socket || !isConnected) {
          set({ error: "Not connected to chat server" });
          return;
        }

        if (!user) {
          set({ error: "User not authenticated" });
          return;
        }

        try {
          socket.emit("new-message", {
            message: trimmedMessage,
            roomId: socketRoomId,
          });
          set({ error: null });
        } catch (err: unknown) {
          console.error("Error sending message:", err);
          set({
            error: "Failed to send message! Refresh the page and try again.",
          });
        }
      },

      sendCursorPosition: (() => {
        let lastSent = 0;
        return (x: number, y: number) => {
          const now = Date.now();
          if (now - lastSent < 66) return; // ~15 updates/sec max
          lastSent = now;
          const { socket, socketRoomId } = get();
          if (socket && socketRoomId) {
            socket.emit("cursor-move", { roomId: socketRoomId, x, y });
          }
        };
      })(),

      joinRoomInSocket: (roomId: string | null) => {
        const currentSocketRoomId = get().socketRoomId;
        if (currentSocketRoomId && get().socket) {
          get().socket?.emit("leave-room", { roomId: currentSocketRoomId });
        }
        set({ socketRoomId: roomId });

        if (roomId) {
          get().disconnectSocket();
          get().initializeSocket();
          get().fetchMessages(roomId);

          // Join the room once the socket connects. All event listeners are
          // registered exactly once inside initializeSocket; registering them
          // here too double-appends every broadcast (shapes, messages) to
          // local state.
          let attempts = 0;
          const tryJoinRoom = () => {
            const socket = get().socket;
            if (socket && socket.connected) {
              socket.emit("join-room", { roomId });
            } else if (attempts++ < 100) {
              setTimeout(tryJoinRoom, 100);
            }
          };
          tryJoinRoom();
        } else {
          get().disconnectSocket();
        }
      },

      initializeSocket: () => {
        const currentSocket = get().socket;
        if (currentSocket?.connected) {
          return; // Already connected
        }

        try {
          // Clean up existing socket if any
          if (currentSocket) {
            currentSocket.removeAllListeners();
            currentSocket.disconnect();
          }

          const socketUrl = getWebSocketUrl();
          const socket = io(socketUrl, {
            withCredentials: true,
            transports: ["websocket", "polling"],
            timeout: 10000,
            forceNew: true,
          });

          // Set up event listeners before setting socket in state
          socket.on("connect", () => {
            set({ isConnected: true, error: null });
          });

          socket.on("disconnect", () => {
            set({ isConnected: false });
          });

          socket.on("connect_error", (error: Error) => {
            console.error("Socket connection error:", error.message);
            // If auth error, redirect to signin
            if (error.message?.includes("Authentication error")) {
              set({
                isConnected: false,
                error: "Session expired. Please sign in again.",
              });
              socket.disconnect();
              if (typeof window !== "undefined") {
                window.location.href = "/signin";
              }
              return;
            }
            set({
              isConnected: false,
              error: "Failed to connect to chat server",
            });
          });

          socket.on("new-shape-added", (newShape: Shape) => {
            set((state) => ({
              shapes: [...state.shapes, newShape],
            }));
          });

          socket.on("shapes-cleared", (data: { roomId: string }) => {
            if (data.roomId === get().socketRoomId) {
              set({ shapes: [] });
            }
          });

          socket.on("room-joined", (data: { roomId: string }) => {
            set({ onlineMembers: [] });
            socket.emit("get-online-members", { roomId: data.roomId });
            void get().fetchShapes(data.roomId);
          });

          socket.on(
            "custom-error",
            (error: { code: number; type: string; message: string }) => {
              console.error("WebSocket error:", error);
              set({ error: error.message });
            },
          );

          socket.on("new-message-added", (newMessage: Message) => {
            const currentMessages = get().messages || [];
            set({ messages: [...currentMessages, newMessage] });
          });

          socket.on(
            "user-joined-room",
            (data: { userId: string; userName: string }) => {
              const currentOnline = get().onlineMembers;
              if (!currentOnline.find((member) => member.id === data.userId)) {
                set({
                  onlineMembers: [
                    ...currentOnline,
                    { id: data.userId, name: data.userName },
                  ],
                });
              }
            },
          );

          socket.on(
            "user-left-room",
            (data: { userId: string }) => {
              const currentOnline = get().onlineMembers;
              set({
                onlineMembers: currentOnline.filter(
                  (member) => member.id !== data.userId,
                ),
                cursors: Object.fromEntries(
                  Object.entries(get().cursors).filter(
                    ([userId]) => userId !== data.userId,
                  ),
                ),
              });
            },
          );

          socket.on(
            "online-members-updated",
            (data: { onlineMembers: OnlineMember[] }) => {
              set({ onlineMembers: data.onlineMembers });
            },
          );

          socket.on(
            "online-members-list",
            (data: { onlineMembers: OnlineMember[] }) => {
              set({ onlineMembers: data.onlineMembers });
            },
          );

          socket.on(
            "user-cursor-moved",
            (data: RemoteCursor) => {
              set((state) => ({
                cursors: {
                  ...state.cursors,
                  [data.userId]: {
                    userId: data.userId,
                    x: data.x,
                    y: data.y,
                    userName: data.userName,
                    color: data.color,
                  },
                },
              }));
            },
          );

          socket.on("room-left", () => {
            set({ onlineMembers: [] });
          });

          set({ socket, isConnected: false, error: null });
        } catch (err: unknown) {
          console.error("Failed to initialize socket:", err);
          set({
            socket: null,
            isConnected: false,
            error: "Failed to initialize chat connection",
          });
        }
      },

      disconnectSocket: () => {
        const socket = get().socket;
        if (!socket) return;

        try {
          socket.removeAllListeners();
          socket.disconnect();

          set({
            socket: null,
            isConnected: false,
            onlineMembers: [],
            shapes: [],
            error: null,
          });
        } catch (err: unknown) {
          console.error("Error during socket disconnection:", err);
        }
      },

      addShape: (shape: Shape, userId?: string) => {
        const socket = get().socket;
        const currentSocketRoomId = get().socketRoomId;

        if (!socket || !userId || !currentSocketRoomId) {
          console.error("Socket, user, or room not available for addShape");
          return;
        }

        // Add shape to local state
        set((state) => ({ shapes: [...state.shapes, shape] }));

        // Emit to websocket server
        socket.emit("new-shape", {
          ...shape,
          roomId: currentSocketRoomId,
          creatorId: userId,
        });
      },

      saveAndBroadcastShape: async (shape: Shape, userId: string) => {
        try {
          const currentSocketRoomId = get().socketRoomId;
          if (!currentSocketRoomId) {
            console.error("No room ID available");
            return;
          }
          const socket = get().socket;
          if (socket && get().isConnected) {
            // WS path: the server persists the shape and broadcasts it to the
            // room. Do NOT also POST via REST — that inserts a second row.
            get().addShape(
              { ...shape, roomId: currentSocketRoomId, creatorId: userId },
              userId,
            );
          } else {
            // Socket unavailable: persist via REST (no real-time broadcast).
            const response = await fetch(
              `/api/rooms/${currentSocketRoomId}/shapes`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: shape.type,
                  dataFromRoughJs: shape.dataFromRoughJs,
                }),
                credentials: "include",
              },
            );
            if (!response.ok) {
              console.error("Failed to save shape");
              return;
            }
            const { shape: savedShape } = await response.json();
            if (savedShape) {
              set((state) => ({ shapes: [...state.shapes, savedShape] }));
            }
          }
        } catch (err: unknown) {
          console.error("Error saving shape:", err);
        }
      },

      clearShapes: async () => {
        const socket = get().socket;
        const currentSocketRoomId = get().socketRoomId;
        if (!currentSocketRoomId) return;

        // Clear local state immediately for better UX
        set({ shapes: [] });

        if (socket && get().isConnected) {
          socket.emit("clear-shapes", { roomId: currentSocketRoomId });
        } else {
          // Fallback to API call if websocket is not available
          try {
            const response = await fetch(
              `/api/rooms/${currentSocketRoomId}/shapes`,
              {
                method: "DELETE",
                credentials: "include",
              },
            );

            if (!response.ok) {
              console.error("Failed to clear shapes via API");
              await get().fetchShapes(currentSocketRoomId);
            }
          } catch (err: unknown) {
            console.error("Error clearing shapes via API:", err);
            await get().fetchShapes(currentSocketRoomId);
          }
        }
      },

      fetchShapes: async (roomId: string) => {
        try {
          const response = await fetch(`/api/rooms/${roomId}/shapes`, {
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            set({ shapes: data.shapes || [] });
          } else {
            throw new Error("Failed to fetch shapes");
          }
        } catch (err: unknown) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to fetch shapes";
          set({ error: errorMessage });
          throw err;
        }
      },
    }),
    {
      name: "room-store",
    },
  ),
);
