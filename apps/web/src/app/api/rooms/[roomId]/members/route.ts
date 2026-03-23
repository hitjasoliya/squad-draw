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

      const membership = await queryOne(
        "SELECT id FROM room_members WHERE room_id = $1 AND user_id = $2",
        [roomId, user.id]
      );

      if (!membership) {
        return Response.json(
          { error: "You are not a member of this room" },
          { status: 403 },
        );
      }

      const members = await query<{
        user_id: string;
        user_name: string;
        user_email: string;
        role: string;
        room_owner_id: string;
      }>(
        `SELECT u.id as user_id, u.name as user_name, u.email as user_email,
                rm.role, r.owner_id as room_owner_id
         FROM room_members rm
         JOIN users u ON rm.user_id = u.id
         JOIN rooms r ON rm.room_id = r.id
         WHERE rm.room_id = $1
         ORDER BY rm.joined_at ASC`,
        [roomId]
      );

      return Response.json({
        members: members.map((member) => ({
          id: member.user_id,
          name: member.user_name,
          email: member.user_email,
          role: member.role,
          isOwner: member.room_owner_id === member.user_id,
        })),
      });
    } catch (error) {
      console.error("Failed to fetch members:", error);
      return Response.json(
        { error: "Failed to fetch members" },
        { status: 500 },
      );
    }
  },
);
