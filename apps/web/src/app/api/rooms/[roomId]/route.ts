import { NextRequest } from "next/server";
import { query, queryOne } from "@repo/db";
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(
  async (
    request: NextRequest,
    user,
    { params }: { params: Promise<{ roomId: string }> },
  ) => {
    try {
      const { roomId } = await params;

      const membership = await queryOne<{
        role: string;
        room_id: string;
        room_name: string;
        room_created_at: Date;
        room_updated_at: Date;
        room_is_shared: boolean;
        owner_id: string;
        owner_name: string;
        owner_email: string;
      }>(
        `SELECT rm.role,
                r.id as room_id, r.name as room_name, r.created_at as room_created_at,
                r.updated_at as room_updated_at, r.is_shared as room_is_shared,
                u.id as owner_id, u.name as owner_name, u.email as owner_email
         FROM room_members rm
         JOIN rooms r ON rm.room_id = r.id
         JOIN users u ON r.owner_id = u.id
         WHERE rm.room_id = $1 AND rm.user_id = $2`,
        [roomId, user.id]
      );

      if (!membership) {
        return Response.json(
          { error: "You are not a member of this room" },
          { status: 403 },
        );
      }

      const room = {
        id: membership.room_id,
        name: membership.room_name,
        createdAt: new Date(membership.room_created_at).toISOString(),
        updatedAt: new Date(membership.room_updated_at).toISOString(),
        isShared: membership.room_is_shared,
        owner: {
          id: membership.owner_id,
          name: membership.owner_name,
          email: membership.owner_email,
        },
        userRole: membership.role,
        memberCount: 0,
        shapeCount: 0,
        messageCount: 0,
      };

      return Response.json({ room });
    } catch (error) {
      console.error("Failed to fetch room:", error);
      return Response.json({ error: "Failed to fetch room" }, { status: 500 });
    }
  },
);

export const DELETE = withAuth(
  async (
    request: NextRequest,
    user,
    { params }: { params: Promise<{ roomId: string }> },
  ) => {
    try {
      const { roomId } = await params;

      const room = await queryOne<{ owner_id: string }>(
        "SELECT owner_id FROM rooms WHERE id = $1",
        [roomId]
      );

      if (!room) {
        return Response.json({ error: "Room not found" }, { status: 404 });
      }

      if (room.owner_id !== user.id) {
        return Response.json(
          { error: "Only room owner can delete the room" },
          { status: 403 },
        );
      }

      await query("DELETE FROM rooms WHERE id = $1", [roomId]);

      return Response.json({ message: "Room deleted successfully" });
    } catch (error) {
      console.error("Failed to delete room:", error);
      return Response.json({ error: "Failed to delete room" }, { status: 500 });
    }
  },
);
