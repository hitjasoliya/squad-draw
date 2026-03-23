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

      const messages = await query<{
        id: string;
        message: string;
        created_at: Date;
        room_id: string;
        user_id: string;
        user_name: string;
        user_email: string;
      }>(
        `SELECT m.id, m.message, m.created_at, m.room_id, m.user_id,
                u.name as user_name, u.email as user_email
         FROM messages m
         JOIN users u ON m.user_id = u.id
         WHERE m.room_id = $1
         ORDER BY m.created_at ASC
         LIMIT 100`,
        [roomId]
      );

      return Response.json({
        messages: messages.map((msg) => ({
          id: msg.id,
          message: msg.message,
          createdAt: new Date(msg.created_at).toISOString(),
          user: {
            id: msg.user_id,
            name: msg.user_name,
            email: msg.user_email,
          },
          roomId: msg.room_id,
          userId: msg.user_id,
        })),
      });
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      return Response.json(
        { error: "Failed to fetch messages" },
        { status: 500 },
      );
    }
  },
);
