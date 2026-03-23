import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Message, User } from "@/components/dashboard/dashboard.types";
import { io, Socket } from "socket.io-client";
import { ShapeType } from "@/schemas/index";

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL;

interface DrawnShape {
  id?: string;
  type: ShapeType;
  dataFromRoughJs: any;
  style?: any;
  creatorId?: string;
  roomId?: string;
}

interface OnlineMember {
    id: string;
    name: string;
}

interface RoomState {
  socket: Socket | null;
  socketRoomId: string | null;
  messages: Message[];
  error: string | null;
  isConnected: boolean;
  onlineMembers: OnlineMember[];
  shapes: DrawnShape[];
  loading: boolean;
  cursors: Record<string, { x: number; y: number; userName: string; color: string }>;
}

interface RoomActions {
  sendMessage: (message: string, user?: User) => Promise<void>;
  joinRoomInSocket: (roomId: string | null) => void;
  initializeSocket: () => void;
  disconnectSocket: () => void;
  addShape: (shape: DrawnShape, userId?: string) => void;
  clearShapes: () => Promise<void>;
  fetchShapes: (roomId: string) => Promise<void>;
  saveAndBroadcastShape: (shape: DrawnShape, userId: string) => Promise<void>;
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
        } catch (err: any) {
          const errorMessage = err.message || "Failed to fetch messages";
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
          // Send
          socket.emit("new-message", {
            message: trimmedMessage,
            roomId: socketRoomId,
          });

          set({ error: null });
        } catch (error) {
          console.error("Error sending message:", error);
          set({
            error: "Failed to send message!! Refresh the page and try again.",
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
        set({ loading: true });
        const currentSocketRoomId = get().socketRoomId;
        if (currentSocketRoomId && get().socket) {
          get().socket?.emit("leave-room", { roomId: currentSocketRoomId });
        }
        set({ socketRoomId: roomId });

        if (roomId) {
          get().disconnectSocket();
          get().initializeSocket();

          const setupRoomListeners = () => {
            const socket = get().socket;
            if (socket && socket.connected) {
              socket.on("new-message-added", (newMessage: Message) => {
                const currentMessages = get().messages || [];
                set({ messages: [...currentMessages, newMessage] });
              });

              socket.on(
                "user-joined-room",
                (data: {
                  userId: string;
                  roomId: string;
                  userName: string;
                }) => {
                  if (data.roomId === roomId) {
                    console.log(`${data.userName} joined the room`);
                    const currentOnline = get().onlineMembers;
                    if (!currentOnline.find(member => member.id === data.userId)) {
                      set({ onlineMembers: [...currentOnline, {id: data.userId, name: data.userName}] });
                    }
                  }
                },
              );

              socket.on(
                "user-left-room",
                (data: {
                  userId: string;
                  roomId: string;
                  userName: string;
                }) => {
                  if (data.roomId === roomId) {
                    console.log(`${data.userName} left the room`);
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
                  }
                },
              );

              socket.on(
                "online-members-updated",
                (data: { roomId: string; onlineMembers: OnlineMember[] }) => {
                  if (data.roomId === roomId) {
                    set({ onlineMembers: data.onlineMembers });
                  }
                },
              );

              socket.on(
                "online-members-list",
                (data: { roomId: string; onlineMembers: OnlineMember[] }) => {
                  if (data.roomId === roomId) {
                    set({ onlineMembers: data.onlineMembers });
                  }
                },
              );

              socket.on("new-shape-added", (newShape: DrawnShape) => {
                const currentShapes = get().shapes || [];
                set({ shapes: [...currentShapes, newShape] });
              });

              socket.on("shapes-cleared", (data: { roomId: string }) => {
                if (data.roomId === roomId) {
                  set({ shapes: [] });
                }
              });

              socket.on(
                "user-cursor-moved",
                (data: { userId: string; userName: string; x: number; y: number; color: string }) => {
                  set((state) => ({
                    cursors: {
                      ...state.cursors,
                      [data.userId]: { x: data.x, y: data.y, userName: data.userName, color: data.color },
                    },
                  }));
                },
              );

              socket.on(
                "room-joined",
                (data: { roomId: string; onlineMembers: OnlineMember[] }) => {
                  console.log("Successfully joined room:", data.roomId);
                  if (data.onlineMembers) {
                    set({ onlineMembers: data.onlineMembers });
                  }
                  socket.emit("get-online-members", { roomId: data.roomId });
                  // Fetch shapes when joining room
                  get().fetchShapes(data.roomId);
                },
              );

              socket.on(
                "custom-error",
                (error: { code: number; type: string; message: string }) => {
                  console.error("WebSocket error:", error);
                  set({ error: error.message });
                },
              );

              socket.on("room-left", (data: { roomId: string }) => {
                console.log("Successfully left room:", data.roomId);
                set({ onlineMembers: [] });
              });

              socket.emit("join-room", { roomId });
            } else {
              setTimeout(setupRoomListeners, 100);
            }
          };

          setupRoomListeners();
          get().fetchMessages(roomId);
        } else {
          get().disconnectSocket();
        }
      },

      initializeSocket: () => {
        console.log("initializeSocket called");
        const currentSocket = get().socket;
        if (currentSocket?.connected) {
          console.log("Socket already connected, skipping initialization");
          return; // Already connected
        }

        try {
          // Clean up existing socket if any
          if (currentSocket) {
            console.log("Cleaning up existing socket");
            currentSocket.removeAllListeners();
            currentSocket.disconnect();
          }

          console.log("Creating new socket connection to:", WEBSOCKET_URL);
          const socket = io(WEBSOCKET_URL, {
            withCredentials: true,
            transports: ["websocket", "polling"],
            timeout: 10000,
            forceNew: true,
          });

          // Set up event listeners before setting socket in state
          socket.on("connect", () => {
            console.log("Socket connected successfully");
            set({ isConnected: true, error: null });
          });

          socket.on("disconnect", (reason) => {
            console.log("Socket disconnected:", reason);
            set({ isConnected: false });
          });

          socket.on("connect_error", (error) => {
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

          socket.on("new-shape-added", (newShape: DrawnShape) => {
            console.log("Received new shape:", newShape);
            // We'll handle the user ID check in the component that calls addShape
            set((state) => ({
              shapes: [...state.shapes, newShape],
            }));
          });

          socket.on("shapes-cleared", (data: { roomId: string }) => {
            console.log("Shapes cleared for room:", data.roomId);
            set({ shapes: [] });
          });

          socket.on(
            "room-joined",
            async (data: { roomId: string; onlineMembers: OnlineMember[] }) => {
              console.log("Successfully joined room:", data.roomId);
              set({ onlineMembers: data.onlineMembers || [] });
              socket.emit("get-online-members", { roomId: data.roomId });

              try {
                await get().fetchShapes(data.roomId);
              } catch (error) {
                console.error("Error fetching shapes:", error);
              }
            },
          );

          socket.on(
            "custom-error",
            (error: { code: number; type: string; message: string }) => {
              console.error("WebSocket custom error:", error);
              set({ error: error.message });
            },
          );

          // Set socket in state after all listeners are set up
          console.log("Setting socket in state");
          set({ socket, isConnected: false, error: null });
        } catch (error) {
          console.error("Failed to initialize socket:", error);
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
          // First remove all listeners
          socket.removeAllListeners();

          // Then disconnect the socket
          socket.disconnect();

          // Update state with partial state update
          set((state) => ({
            ...state,
            socket: null,
            isConnected: false,
            onlineMembers: [],
            shapes: [],
            error: null,
          }));
        } catch (error) {
          console.error("Error during socket disconnection:", error);
        }
      },

      addShape: (shape: DrawnShape, userId?: string) => {
        console.log("addShape called with:", shape);
        const socket = get().socket;
        const currentSocketRoomId = get().socketRoomId;

        console.log(
          "addShape - socket:",
          !!socket,
          "user:",
          !!userId,
          "isConnected:",
          get().isConnected,
        );

        if (!socket || !userId || !currentSocketRoomId) {
          console.error("Socket, user, or room not available for addShape");
          return;
        }

        // Add shape to local state
        console.log("Adding shape to local state");
        set((state) => ({ shapes: [...state.shapes, shape] }));

        // Emit to websocket server
        console.log("Emitting new-shape event:", shape);
        socket.emit("new-shape", {
          ...shape,
          roomId: currentSocketRoomId,
          creatorId: userId,
        });
      },

      saveAndBroadcastShape: async (shape: DrawnShape, userId: string) => {
        try {
          const currentSocketRoomId = get().socketRoomId;
          if (!currentSocketRoomId) {
            console.error("No room ID available");
            return;
          }
          get().addShape({ ...shape, roomId: currentSocketRoomId, creatorId: userId }, userId);
          const response = await fetch(`/api/rooms/${currentSocketRoomId}/shapes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: shape.type,
              dataFromRoughJs: shape.dataFromRoughJs,
              style: shape.style || {},
            }),
            credentials: "include",
          });
          if (!response.ok) {
            // Optionally: use notification store or toast
            console.error("Failed to save shape");
            return;
          }
          const { shape: savedShape } = await response.json();
        } catch (error) {
          // Optionally: use notification store or toast
          console.error("Error saving shape:", error);
        }
      },

      clearShapes: async () => {
        const socket = get().socket;
        const currentSocketRoomId = get().socketRoomId;

        console.log("clearShapes called:", {
          socket: !!socket,
          currentSocketRoomId,
          isConnected: get().isConnected,
          socketConnected: socket?.connected,
          socketId: socket?.id,
        });

        // Clear local state immediately for better UX
        set({ shapes: [] });

        if (socket && currentSocketRoomId && get().isConnected) {
          console.log("Emitting clear-shapes event to room:", currentSocketRoomId);
          socket.emit("clear-shapes", { roomId: currentSocketRoomId });

          // Add a callback to check if the event was received
          socket.on("shapes-cleared", (data) => {
            console.log("Received shapes-cleared confirmation:", data);
            set({ shapes: [] });
          });

          socket.on("custom-error", (error) => {
            console.error("Received custom error:", error);
          });
        } else {
          console.log("Socket not available, using API fallback");
          // Fallback to API call if websocket is not available
          try {
            const response = await fetch(`/api/rooms/${currentSocketRoomId}/shapes`, {
              method: "DELETE",
              credentials: "include",
            });

            if (!response.ok) {
              console.error("Failed to clear shapes via API");
              // Revert local state if API call fails
              const shapesResponse = await fetch(
                `/api/rooms/${currentSocketRoomId}/shapes`,
                {
                  credentials: "include",
                },
              );
              if (shapesResponse.ok) {
                const data = await shapesResponse.json();
                set({ shapes: data.shapes || [] });
              }
            }
          } catch (error) {
            console.error("Error clearing shapes via API:", error);
          }
        }
      },

      fetchShapes: async (roomId: string) => {
        set({ loading: true });
        try {
          const response = await fetch(`/api/rooms/${roomId}/shapes`, {
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            set({ shapes: data.shapes || [], loading: false });
          } else {
            throw new Error("Failed to fetch shapes");
          }
        } catch (err: any) {
          const errorMessage = err.message || "Failed to fetch shapes";
          set({ error: errorMessage, loading: false });
          throw err;
        }
      },
    }),
    {
      name: "room-store",
    },
  ),
);