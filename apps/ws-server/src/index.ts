import { Server, Socket } from "socket.io";
import { createServer } from "http";
import dotenv from "dotenv";
import path from "path";
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
import { query } from "@repo/db";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
console.log(process.env.ORIGIN_URL);

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

io.use(authMiddleware);

// Function to delete old messages
const deleteOldMessages = async () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    try {
        const result = await query(
            "DELETE FROM messages WHERE created_at < $1",
            [threeDaysAgo]
        );
        console.log(`Deleted old messages.`);
    } catch (error) {
        console.error("Error deleting old messages:", error);
    }
};

const deleteOldShapes = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  try {
    const result = await query(
        "DELETE FROM shapes WHERE created_at < $1",
        [thirtyDaysAgo]
    );
    console.log(`Deleted old shapes.`);
  } catch (error) {
    console.error("Error deleting old shapes:", error);
  }
};


// general error handling
const handleSocketEvent = async (
  socket: Socket,
  eventName: string,
  handler: (socket: Socket, data: any) => Promise<void>,
  data: any,
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
      data,
    );
  });

  socket.on("new-shape", async (data) => {
    await handleSocketEvent(socket, "new-shape", newShapeHandler, data);
  });

  socket.on("new-message", async (data) => {
    await handleSocketEvent(socket, "new-message", newMessageHandler, data);
  });

  socket.on("clear-shapes", async (data) => {
    console.log(
      "Received clear-shapes event from client:",
      socket.id,
      "with data:",
      data,
    );
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

httpServer.listen(8080, () => {
  console.log(
    `WebSocket server is running on port 8080`,
  );
  deleteOldMessages();
  setInterval(deleteOldMessages, 1000 * 60 * 60 * 24);
  deleteOldShapes();
  setInterval(deleteOldShapes, 1000 * 60 * 60 * 24 );
});