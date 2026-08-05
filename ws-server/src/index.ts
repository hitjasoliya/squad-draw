import { Server, Socket } from "socket.io";
import { createServer } from "http";
import dotenv from "dotenv";
import path from "path";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import { authMiddleware } from "./middlewares/auth.middleware";
import {
  joinRoomHandler,
  leaveRoomHandler,
  getOnlineMembersHandler,
} from "./handlers/connection.handlers";
import {
  newMessageHandler,
  newShapeHandler,
  clearShapesHandler,
  cursorMoveHandler,
} from "./handlers/content.handlers";
import { query, queryOne } from "./db";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: (requestOrigin, callback) => callback(null, true),
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

if (process.env.REDIS_URL) {
  const REDIS_URL = process.env.REDIS_URL;
  const pubClient = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));
  console.log("Redis adapter attached to Socket.IO server");
}

io.use(authMiddleware);

// Function to delete old messages with Postgres advisory lock
const deleteOldMessages = async () => {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  try {
    const lockResult = await queryOne<{ lock: boolean }>(
      "SELECT pg_try_advisory_lock(1001) as lock"
    );
    if (!lockResult?.lock) {
      return;
    }
    try {
      await query("DELETE FROM messages WHERE created_at < $1", [threeDaysAgo]);
      console.log("Deleted old messages.");
    } finally {
      await query("SELECT pg_advisory_unlock(1001)");
    }
  } catch (error) {
    console.error("Error deleting old messages:", error);
  }
};

// Function to delete old shapes with Postgres advisory lock
const deleteOldShapes = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const lockResult = await queryOne<{ lock: boolean }>(
      "SELECT pg_try_advisory_lock(1002) as lock"
    );
    if (!lockResult?.lock) {
      return;
    }
    try {
      await query("DELETE FROM shapes WHERE created_at < $1", [thirtyDaysAgo]);
      console.log("Deleted old shapes.");
    } finally {
      await query("SELECT pg_advisory_unlock(1002)");
    }
  } catch (error) {
    console.error("Error deleting old shapes:", error);
  }
};

// General error handling wrapper
const handleSocketEvent = async <T>(
  socket: Socket,
  eventName: string,
  handler: (socket: Socket, data: T) => Promise<void>,
  data: T
) => {
  try {
    await handler(socket, data);
  } catch (error) {
    console.error(`Error in ${eventName} event:`, error);
    socket.emit("custom-error", {
      code: 500,
      type: "INTERNAL_ERROR",
      message: `Failed to ${eventName.replace("-", " ")}`,
    });
  }
};

io.on("connection", (socket: Socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join-room", async (data) => {
    await handleSocketEvent(socket, "join-room", joinRoomHandler, data);
  });

  socket.on("leave-room", async (data) => {
    await handleSocketEvent(socket, "leave-room", leaveRoomHandler, data);
  });

  socket.on("get-online-members", async (data) => {
    await handleSocketEvent(
      socket,
      "get-online-members",
      getOnlineMembersHandler,
      data
    );
  });

  socket.on("new-shape", async (data) => {
    await handleSocketEvent(socket, "new-shape", newShapeHandler, data);
  });

  socket.on("new-message", async (data) => {
    await handleSocketEvent(socket, "new-message", newMessageHandler, data);
  });

  socket.on("clear-shapes", async (data) => {
    await handleSocketEvent(socket, "clear-shapes", clearShapesHandler, data);
  });

  socket.on("cursor-move", async (data) => {
    await handleSocketEvent(socket, "cursor-move", cursorMoveHandler, data);
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });

  socket.on("disconnect", async () => {
    console.log("Client disconnected:", socket.id);

    if (socket.data.currentRoom) {
      await handleSocketEvent(socket, "leave-room", leaveRoomHandler, {
        roomId: socket.data.currentRoom,
      });
    }
  });
});

io.engine.on("connection_error", (error) => {
  console.error("Connection error:", error);
});

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`WebSocket server is running on port ${PORT}`);
  deleteOldMessages();
  setInterval(deleteOldMessages, 1000 * 60 * 60 * 24);
  deleteOldShapes();
  setInterval(deleteOldShapes, 1000 * 60 * 60 * 24);
});
