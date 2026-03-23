import { NextRequest } from "next/server";
import { query, queryOne } from "@repo/db";
import { withAuth } from "@/lib/auth-middleware";

const MAX_JOINED_ROOMS = 5;

export const POST = withAuth(
  async (
    request: NextRequest,
    user,
    { params }: { params: Promise<{ roomId: string }> },
  ) => {
    try {
      const { roomId } = await params;

      const room = await queryOne<{ id: string; name: string; is_shared: boolean }>(
        "SELECT id, name, is_shared FROM rooms WHERE id = $1",
        [roomId]
      );

      if (!room) {
        return Response.json({ error: "Room not found" }, { status: 404 });
      }

      if (!room.is_shared) {
        return Response.json(
          { error: "Room is not shared and cannot be joined" },
          { status: 403 },
        );
      }

      const existingMember = await queryOne(
        "SELECT id FROM room_members WHERE room_id = $1 AND user_id = $2",
        [roomId, user.id]
      );

      if (existingMember) {
        return Response.json(
          { error: "You are already a member of this room" },
          { status: 400 },
        );
      }

      const countResult = await queryOne<{ count: string }>(
        "SELECT COUNT(*)::text as count FROM room_members WHERE user_id = $1",
        [user.id]
      );

      const userJoinedRoomsCount = parseInt(countResult?.count || "0");

      if (userJoinedRoomsCount >= MAX_JOINED_ROOMS) {
        return Response.json(
          {
            error: `You can only join up to ${MAX_JOINED_ROOMS} rooms. Please leave an existing room to join a new one.`,
            limit: MAX_JOINED_ROOMS,
            current: userJoinedRoomsCount,
          },
          { status: 400 },
        );
      }

      await query(
        `INSERT INTO room_members (id, room_id, user_id, role, joined_at)
         VALUES (gen_random_uuid()::text, $1, $2, 'MEMBER', NOW())`,
        [roomId, user.id]
      );

      return Response.json(
        {
          message: "Successfully joined room",
          room: { id: room.id, name: room.name },
        },
        { status: 201 },
      );
    } catch (error) {
      console.error("Failed to join room:", error);
      return Response.json({ error: "Failed to join room" }, { status: 500 });
    }
  },
);
