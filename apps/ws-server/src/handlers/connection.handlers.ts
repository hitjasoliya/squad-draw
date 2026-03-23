import { query, queryOne } from "@repo/db";
import { Socket } from "socket.io";

const colors = [
  "#FF0000", "#FF7F00", "#FFFF00", "#00FF00",
  "#0000FF", "#4B0082", "#9400D3"
];

const getRandomColor = () => {
  return colors[Math.floor(Math.random() * colors.length)];
};

export const joinRoomHandler = async (
  socket: Socket,
  data: { roomId: string },
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
      message: "Invalid join room data format",
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

  try {
    const room = await queryOne(
      "SELECT id FROM rooms WHERE id = $1",
      [data.roomId]
    );

    if (!room) {
      socket.emit("custom-error", {
        code: 404,
        type: "ROOM_NOT_FOUND",
        message: "Room does not exist",
      });
      return;
    }

    const isMember = await queryOne(
      "SELECT id FROM room_members WHERE room_id = $1 AND user_id = $2",
      [data.roomId, socket.data.user.id]
    );

    if (!isMember) {
      console.log("You are not a member of this room");
      socket.emit("custom-error", {
        code: 403,
        type: "FORBIDDEN",
        message: "You are not a member of this room",
      });
      return;
    }

    socket.join(data.roomId);
    socket.data.currentRoom = data.roomId;
    socket.data.color = getRandomColor();

    const socketsInRoom = await socket.in(data.roomId).fetchSockets();
    const onlineUsers = socketsInRoom.map((s) => ({id: s.data.user?.id, name: s.data.user?.name}))
    .filter((user) => user.id)
    .concat({id: socket.data.user.id, name: socket.data.user.name})
    
    const uniqueOnlineUsers = onlineUsers.filter((user, index, self) =>
        index === self.findIndex((u) => (
            u.id === user.id
        ))
    )

    socket.emit("room-joined", {
      code: 200,
      type: "SUCCESS",
      roomId: data.roomId,
      onlineMembers: uniqueOnlineUsers,
    });

    socket.to(data.roomId).emit("user-joined-room", {
      code: 200,
      type: "USER_JOINED_ROOM",
      roomId: data.roomId,
      userId: socket.data.user.id,
      userName: socket.data.user.name,
      color: socket.data.color,
    });

    socket.to(data.roomId).emit("online-members-updated", {
      roomId: data.roomId,
      onlineMembers: uniqueOnlineUsers,
    });
  } catch (error) {
    console.error("Error in joinRoomHandler:", error);
    socket.emit("custom-error", {
      code: 500,
      type: "INTERNAL_ERROR",
      message: "Failed to join room",
    });
  }
};

export const leaveRoomHandler = async (
  socket: Socket,
  data: { roomId: string },
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
      message: "Invalid leave room data format",
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

  try {
    const room = await queryOne(
      "SELECT id FROM rooms WHERE id = $1",
      [data.roomId]
    );

    if (!room) {
      socket.emit("custom-error", {
        code: 404,
        type: "ROOM_NOT_FOUND",
        message: "Room does not exist",
      });
      return;
    }

    if (!socket.rooms.has(data.roomId)) {
      socket.emit("custom-error", {
        code: 400,
        type: "NOT_IN_ROOM",
        message: "You are not in this room",
      });
      return;
    }

    const socketsInRoom = await socket.in(data.roomId).fetchSockets();
    const remainingUsers = socketsInRoom
      .map((s) => ({id: s.data.user?.id, name: s.data.user?.name}))
      .filter((user) => user.id && user.id !== socket.data.user.id);

    socket.leave(data.roomId);
    socket.data.currentRoom = null;

    socket.emit("room-left", {
      code: 200,
      type: "SUCCESS",
      roomId: data.roomId,
    });

    socket.to(data.roomId).emit("user-left-room", {
      code: 200,
      type: "USER_LEFT_ROOM",
      roomId: data.roomId,
      userId: socket.data.user.id,
      userName: socket.data.user.name,
    });

    socket.to(data.roomId).emit("online-members-updated", {
      roomId: data.roomId,
      onlineMembers: remainingUsers,
    });
  } catch (error) {
    console.error("Error in leaveRoomHandler:", error);
    socket.emit("custom-error", {
      code: 500,
      type: "INTERNAL_ERROR",
      message: "Failed to leave room",
    });
  }
};

export const getOnlineMembersHandler = async (
  socket: Socket,
  data: { roomId: string },
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
      message: "Invalid get online members data format",
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

  try {
    const isMember = await queryOne(
      "SELECT id FROM room_members WHERE room_id = $1 AND user_id = $2",
      [data.roomId, socket.data.user.id]
    );

    if (!isMember) {
      socket.emit("custom-error", {
        code: 403,
        type: "FORBIDDEN",
        message: "You are not a member of this room",
      });
      return;
    }

    const socketsInRoom = await socket.in(data.roomId).fetchSockets();
    const onlineUsers = socketsInRoom
      .map((s) => ({id: s.data.user?.id, name: s.data.user?.name}))
      .filter((user) => user.id);

    if (socket.rooms.has(data.roomId)) {
      onlineUsers.push({id: socket.data.user.id, name: socket.data.user.name});
    }

    const uniqueOnlineUsers = onlineUsers.filter((user, index, self) =>
        index === self.findIndex((u) => (
            u.id === user.id
        ))
    )

    socket.emit("online-members-list", {
      code: 200,
      type: "SUCCESS",
      roomId: data.roomId,
      onlineMembers: uniqueOnlineUsers,
    });
  } catch (error) {
    console.error("Error in getOnlineMembersHandler:", error);
    socket.emit("custom-error", {
      code: 500,
      type: "INTERNAL_ERROR",
      message: "Failed to get online members",
    });
  }
};