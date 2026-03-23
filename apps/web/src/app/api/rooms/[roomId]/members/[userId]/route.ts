import { NextRequest } from "next/server";
import { query, queryOne } from "@repo/db";
import { withAuth } from "@/lib/auth-middleware";
import { validateAdminPermission } from "../../../utils";

// Kick member from room
export const DELETE = withAuth(
  async (
    request: NextRequest,
    user,
    { params }: { params: Promise<{ roomId: string; userId: string }> },
  ) => {
    try {
      const { roomId, userId } = await params;

      await validateAdminPermission(user.id, roomId);

      const targetMember = await queryOne<{
        id: string;
        user_id: string;
        room_id: string;
        room_owner_id: string;
      }>(
        `SELECT rm.id, rm.user_id, rm.room_id, r.owner_id as room_owner_id
         FROM room_members rm
         JOIN rooms r ON rm.room_id = r.id
         WHERE rm.user_id = $1 AND rm.room_id = $2`,
        [userId, roomId]
      );

      if (!targetMember) {
        return Response.json(
          { error: "User is not a member of this room" },
          { status: 404 },
        );
      }

      if (targetMember.room_owner_id === userId) {
        return Response.json(
          { error: "Cannot kick the room owner" },
          { status: 403 },
        );
      }

      if (userId === user.id) {
        return Response.json(
          { error: "Cannot kick yourself. Use leave room instead" },
          { status: 400 },
        );
      }

      await query(
        "DELETE FROM room_members WHERE user_id = $1 AND room_id = $2",
        [userId, roomId]
      );

      return Response.json({ message: "Member kicked successfully" });
    } catch (error: any) {
      if (error.message === "Not a member of this room") {
        return Response.json({ error: error.message }, { status: 403 });
      }
      if (error.message === "Admin permission required") {
        return Response.json({ error: error.message }, { status: 403 });
      }
      console.error("Failed to kick member:", error);
      return Response.json({ error: "Failed to kick member" }, { status: 500 });
    }
  },
);
