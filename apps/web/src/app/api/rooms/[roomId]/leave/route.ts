import { NextRequest } from "next/server";
import { query, queryOne } from "@repo/db";
import { withAuth } from "@/lib/auth-middleware";

export const DELETE = withAuth(
  async (
    request: NextRequest,
    user,
    { params }: { params: Promise<{ roomId: string }> },
  ) => {
    try {
      const { roomId } = await params;

      const membership = await queryOne<{
        id: string;
        room_owner_id: string;
        room_name: string;
      }>(
        `SELECT rm.id, r.owner_id as room_owner_id, r.name as room_name
         FROM room_members rm
         JOIN rooms r ON rm.room_id = r.id
         WHERE rm.room_id = $1 AND rm.user_id = $2`,
        [roomId, user.id]
      );

      if (!membership) {
        return Response.json(
          { error: "You are not a member of this room" },
          { status: 404 },
        );
      }

      // If user is the owner, handle ownership transfer
      if (membership.room_owner_id === user.id) {
        const otherAdmin = await queryOne<{ user_id: string }>(
          `SELECT user_id FROM room_members
           WHERE room_id = $1 AND user_id != $2 AND role = 'ADMIN'
           LIMIT 1`,
          [roomId, user.id]
        );

        if (otherAdmin) {
          await query(
            "UPDATE rooms SET owner_id = $1, updated_at = NOW() WHERE id = $2",
            [otherAdmin.user_id, roomId]
          );
        } else {
          const oldestMember = await queryOne<{ id: string; user_id: string }>(
            `SELECT id, user_id FROM room_members
             WHERE room_id = $1 AND user_id != $2
             ORDER BY joined_at ASC
             LIMIT 1`,
            [roomId, user.id]
          );

          if (oldestMember) {
            await query(
              "UPDATE rooms SET owner_id = $1, updated_at = NOW() WHERE id = $2",
              [oldestMember.user_id, roomId]
            );
            await query(
              "UPDATE room_members SET role = 'ADMIN' WHERE id = $1",
              [oldestMember.id]
            );
          } else {
            // No other members, delete the room
            await query("DELETE FROM rooms WHERE id = $1", [roomId]);
            return Response.json({
              message: "Room deleted as you were the last member",
            });
          }
        }
      }

      // Remove user from room
      await query("DELETE FROM room_members WHERE id = $1", [membership.id]);

      return Response.json({ message: "Successfully left room" });
    } catch (error) {
      console.error("Failed to leave room:", error);
      return Response.json({ error: "Failed to leave room" }, { status: 500 });
    }
  },
);
