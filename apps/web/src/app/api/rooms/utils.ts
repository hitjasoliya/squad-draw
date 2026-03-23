import { query, queryOne } from "@repo/db";
import { NextRequest } from "next/server";
import { getAuthenticatedUser, AuthenticatedUser } from "@/lib/auth-middleware";

export const validateMembership = async (userId: string, roomId: string) => {
  const member = await queryOne<{
    id: string;
    role: string;
    user_id: string;
    room_id: string;
    room_name: string;
    room_owner_id: string;
    room_is_shared: boolean;
  }>(
    `SELECT rm.id, rm.role, rm.user_id, rm.room_id,
            r.name as room_name, r.owner_id as room_owner_id, r.is_shared as room_is_shared
     FROM room_members rm
     JOIN rooms r ON rm.room_id = r.id
     WHERE rm.user_id = $1 AND rm.room_id = $2`,
    [userId, roomId]
  );
  return member;
};

export const validateAdminPermission = async (
  userId: string,
  roomId: string,
) => {
  const member = await validateMembership(userId, roomId);
  if (!member) {
    throw new Error("Not a member of this room");
  }
  if (member.role !== "ADMIN" && member.room_owner_id !== userId) {
    throw new Error("Admin permission required");
  }
  return member;
};

export const validateOwnerPermission = async (
  userId: string,
  roomId: string,
) => {
  const room = await queryOne<{ id: string; owner_id: string }>(
    "SELECT id, owner_id FROM rooms WHERE id = $1",
    [roomId]
  );
  if (!room) {
    throw new Error("Room not found");
  }
  if (room.owner_id !== userId) {
    throw new Error("Owner permission required");
  }
  return room;
};

export const createErrorResponse = (message: string, status: number) => {
  return Response.json({ message }, { status });
};

export const createSuccessResponse = (data: any, status: number = 200) => {
  return Response.json(data, { status });
};

export const getUserFromRequest = async (
  request: NextRequest,
): Promise<AuthenticatedUser> => {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
};
