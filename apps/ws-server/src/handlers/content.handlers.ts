import { Socket } from "socket.io";
import { query, queryOne } from "@repo/db";
import type { ShapeType } from "@repo/db";

interface NewShapeData {
  type: ShapeType;
  dataFromRoughJs: any;
  roomId: string;
  creatorId: string;
}

export const newShapeHandler = async (
  socket: Socket,
  newShape: NewShapeData,
) => {
  const { type, dataFromRoughJs, roomId, creatorId } = newShape;

  if (socket.data.currentRoom !== roomId) {
    socket.emit("custom-error", {
      code: 400,
      type: "NOT_IN_ROOM",
      message:
        "You are not in this room! dont try to send shapes to other rooms , dont do these crazy things",
    });
    return;
  }

  const createdShape = await queryOne<{
    id: string;
    type: string;
    data_from_rough_js: any;
    created_at: Date;
    updated_at: Date;
    room_id: string;
    creator_id: string;
  }>(
    `INSERT INTO shapes (id, type, data_from_rough_js, room_id, creator_id, created_at, updated_at)
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW(), NOW())
     RETURNING id, type, data_from_rough_js, created_at, updated_at, room_id, creator_id`,
    [type, JSON.stringify(dataFromRoughJs), roomId, creatorId]
  );

  // Transform to match the shape format the client expects
  const shapeForClient = createdShape ? {
    id: createdShape.id,
    type: createdShape.type,
    dataFromRoughJs: createdShape.data_from_rough_js,
    createdAt: createdShape.created_at,
    updatedAt: createdShape.updated_at,
    roomId: createdShape.room_id,
    creatorId: createdShape.creator_id,
  } : null;

  socket.to(roomId).emit("new-shape-added", shapeForClient);
};

export const newMessageHandler = async (
  socket: Socket,
  data: { message: string; roomId: string },
) => {
  if (!socket.data.user) {
    socket.emit("custom-error", {
      code: 401,
      type: "UNAUTHORIZED",
      message: "User not authenticated",
    });
    return;
  }
  if (!data || typeof data !== "object") {
    socket.emit("custom-error", {
      code: 400,
      type: "INVALID_DATA",
      message: "Invalid message data format",
    });
    return;
  }
  if (!data.message || typeof data.message !== "string" || !data.message.trim()) {
    socket.emit("custom-error", {
      code: 400,
      type: "INVALID_MESSAGE",
      message: "Message content is required and must be a non-empty string",
    });
    return;
  }
  if (data.message.trim().length > 1000) {
    socket.emit("custom-error", {
      code: 400,
      type: "MESSAGE_TOO_LONG",
      message: "Message cannot exceed 1000 characters",
    });
    return;
  }
  if (!data.roomId || typeof data.roomId !== "string" || !data.roomId.trim()) {
    socket.emit("custom-error", {
      code: 400,
      type: "INVALID_ROOM_ID",
      message: "Room ID is required and must be a valid string",
    });
    return;
  }
  if (socket.data.currentRoom !== data.roomId) {
    socket.emit("custom-error", {
      code: 400,
      type: "NOT_IN_ROOM",
      message: "You are not in this room",
    });
    return;
  }
  try {
    const roomMembership = await queryOne(
      "SELECT rm.id FROM room_members rm WHERE rm.room_id = $1 AND rm.user_id = $2",
      [data.roomId, socket.data.user.id]
    );

    if (!roomMembership) {
      socket.emit("custom-error", {
        code: 403,
        type: "FORBIDDEN",
        message: "You are not a member of this room",
      });
      return;
    }

    const tempMessage = {
        id: new Date().toISOString(),
        message: data.message.trim(),
        createdAt: new Date().toISOString(),
        user: {
            id: socket.data.user.id,
            name: socket.data.user.name,
            email: socket.data.user.email,
        },
        roomId: data.roomId,
        userId: socket.data.user.id,
    };
    
    socket.to(data.roomId).emit("new-message-added", tempMessage);
    socket.emit("new-message-added", tempMessage);

    await query(
      `INSERT INTO messages (id, message, room_id, user_id, created_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, NOW())`,
      [data.message.trim(), data.roomId, socket.data.user.id]
    );
  } catch (error) {
    console.error("Error creating message:", error);
    socket.emit("custom-error", {
      code: 500,
      type: "INTERNAL_ERROR",
      message: "Failed to save message",
    });
  }
};

export const cursorMoveHandler = async (
  socket: Socket,
  data: { roomId: string; x: number; y: number },
) => {
  if (socket.data.currentRoom !== data.roomId) {
    return;
  }

  socket.to(data.roomId).emit("user-cursor-moved", {
    userId: socket.data.user.id,
    userName: socket.data.user.name,
    x: data.x,
    y: data.y,
    color: socket.data.color,
  });
};

export const clearShapesHandler = async (
  socket: Socket,
  data: { roomId: string },
) => {
  console.log("clearShapesHandler called with data:", data);
  console.log("socket.data.user:", socket.data.user);
  console.log("socket.data.currentRoom:", socket.data.currentRoom);

  if (!socket.data.user) {
    console.log("User not authenticated");
    socket.emit("custom-error", {
      code: 401,
      type: "UNAUTHORIZED",
      message: "User not authenticated",
    });
    return;
  }

  if (!data.roomId || typeof data.roomId !== "string" || !data.roomId.trim()) {
    socket.emit("custom-error", {
      code: 400,
      type: "INVALID_ROOM_ID",
      message: "Room ID is required and must be a valid string",
    });
    return;
  }

  if (socket.data.currentRoom !== data.roomId) {
    socket.emit("custom-error", {
      code: 400,
      type: "NOT_IN_ROOM",
      message: "You are not in this room",
    });
    return;
  }

  try {
    const roomMembership = await queryOne(
      "SELECT rm.id FROM room_members rm WHERE rm.room_id = $1 AND rm.user_id = $2",
      [data.roomId, socket.data.user.id]
    );

    if (!roomMembership) {
      socket.emit("custom-error", {
        code: 403,
        type: "FORBIDDEN",
        message: "You are not a member of this room",
      });
      return;
    }

    console.log("Clearing shapes for room:", data.roomId);

    await query("DELETE FROM shapes WHERE room_id = $1", [data.roomId]);

    console.log("Deleted shapes");

    socket.to(data.roomId).emit("shapes-cleared", { roomId: data.roomId });
    socket.emit("shapes-cleared", { roomId: data.roomId });

    console.log("Shapes cleared successfully");
  } catch (error) {
    console.error("Error clearing shapes:", error);
    socket.emit("custom-error", {
      code: 500,
      type: "INTERNAL_ERROR",
      message: "Failed to clear shapes",
    });
  }
};