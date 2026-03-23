import { NextRequest } from "next/server";
import { query, queryOne } from "@repo/db";
import { withAuth } from "@/lib/auth-middleware";
import { validateMembership } from "../../../utils";

interface RouteParams {
  params: Promise<{ roomId: string; shapeId: string }>;
}

export const DELETE = withAuth(
  async (request: NextRequest, user, { params }: RouteParams) => {
    try {
      const { roomId, shapeId } = await params;

      const member = await validateMembership(user.id, roomId);
      if (!member) {
        return Response.json(
          { error: "You are not a member of this room" },
          { status: 403 },
        );
      }

      const shape = await queryOne<{ id: string; room_id: string }>(
        "SELECT id, room_id FROM shapes WHERE id = $1",
        [shapeId]
      );

      if (!shape) {
        return Response.json({ error: "Shape not found" }, { status: 404 });
      }

      if (shape.room_id !== roomId) {
        return Response.json(
          { error: "Shape does not belong to this room" },
          { status: 400 },
        );
      }

      await query("DELETE FROM shapes WHERE id = $1", [shapeId]);

      return Response.json({ message: "Shape deleted successfully" });
    } catch (error) {
      console.error("Failed to delete shape:", error);
      return Response.json(
        { error: "Failed to delete shape" },
        { status: 500 },
      );
    }
  },
);
