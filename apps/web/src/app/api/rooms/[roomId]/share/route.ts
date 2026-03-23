import { NextRequest } from "next/server";
import { query, queryOne } from "@repo/db";
import { withAuth } from "@/lib/auth-middleware";

export const PATCH = withAuth(
  async (
    request: NextRequest,
    user,
    { params }: { params: Promise<{ roomId: string }> },
  ) => {
    try {
      const { roomId } = await params;

      const membership = await queryOne<{
        role: string;
        room_owner_id: string;
        room_is_shared: boolean;
      }>(
        `SELECT rm.role, r.owner_id as room_owner_id, r.is_shared as room_is_shared
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

      const isOwner = membership.room_owner_id === user.id;
      const isAdmin = membership.role === "ADMIN";

      if (!isOwner && !isAdmin) {
        return Response.json(
          { error: "Only room owner or admins can share the room" },
          { status: 403 },
        );
      }

      await query(
        "UPDATE rooms SET is_shared = true, updated_at = NOW() WHERE id = $1",
        [roomId]
      );

      const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
      if (!BASE_URL)
        throw new Error(
          "NEXT_PUBLIC_BASE_URL environment variable is required",
        );

      return Response.json({
        message: "Room shared successfully",
        shareLink: `${BASE_URL}/room/${roomId}`,
      });
    } catch (error) {
      console.error("Failed to share room:", error);
      return Response.json({ error: "Failed to share room" }, { status: 500 });
    }
  },
);
