import { NextRequest } from "next/server";
import { query, queryOne } from "@repo/db";
import { SimpleShapeSchema } from "@/schemas/index";
import { ZodError } from "zod";
import { withAuth } from "@/lib/auth-middleware";
import { validateMembership } from "../../utils";

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

export const GET = withAuth(
  async (request: NextRequest, user, context: RouteParams) => {
    try {
      const { roomId } = await context.params;
      console.log("GET request received", roomId);
      const member = await validateMembership(user.id, roomId);
      if (!member) {
        return Response.json(
          { error: "You are not a member of this room" },
          { status: 403 },
        );
      }

      const shapes = await query<{
        id: string;
        type: string;
        data_from_rough_js: any;
        created_at: Date;
        updated_at: Date;
        room_id: string;
        creator_id: string;
        creator_name: string;
        creator_email: string;
      }>(
        `SELECT s.id, s.type, s.data_from_rough_js, s.created_at, s.updated_at,
                s.room_id, s.creator_id,
                u.name as creator_name, u.email as creator_email
         FROM shapes s
         JOIN users u ON s.creator_id = u.id
         WHERE s.room_id = $1
         ORDER BY s.created_at ASC`,
        [roomId]
      );

      return Response.json({
        shapes: shapes.map((s) => ({
          id: s.id,
          type: s.type,
          dataFromRoughJs: s.data_from_rough_js,
          createdAt: s.created_at,
          updatedAt: s.updated_at,
          roomId: s.room_id,
          creatorId: s.creator_id,
          creator: {
            id: s.creator_id,
            name: s.creator_name,
            email: s.creator_email,
          },
        })),
      });
    } catch (error) {
      console.error("Failed to fetch shapes:", error);
      return Response.json(
        { error: "Failed to fetch shapes" },
        { status: 500 },
      );
    }
  },
);

export const POST = withAuth(
  async (request: NextRequest, user, context: RouteParams) => {
    console.log("POST request received");
    try {
      const { roomId } = await context.params;
      const body = await request.json();

      const member = await validateMembership(user.id, roomId);
      if (!member) {
        return Response.json(
          { error: "You are not a member of this room" },
          { status: 403 },
        );
      }

      const validatedShape = SimpleShapeSchema.parse(body);

      const shape = await queryOne<{
        id: string;
        type: string;
        data_from_rough_js: any;
        created_at: Date;
        updated_at: Date;
        room_id: string;
        creator_id: string;
      }>(
        `INSERT INTO shapes (id, type, data_from_rough_js, room_id, creator_id, created_at, updated_at)
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW(), NOW())
         RETURNING id, type, data_from_rough_js, created_at, updated_at, room_id, creator_id`,
        [validatedShape.type, JSON.stringify(validatedShape.dataFromRoughJs), roomId, user.id]
      );

      console.log("Shape created:", shape);
      return Response.json({
        shape: {
          ...shape,
          dataFromRoughJs: shape?.data_from_rough_js,
          creator: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
        },
      }, { status: 201 });
    } catch (error) {
      if (error instanceof ZodError) {
        return Response.json(
          { error: error.errors[0]?.message || "Invalid request" },
          { status: 400 },
        );
      }
      console.error("Failed to create shape:", error);
      return Response.json(
        { error: "Failed to create shape" },
        { status: 500 },
      );
    }
  },
);

export const DELETE = withAuth(
  async (request: NextRequest, user, context: RouteParams) => {
    try {
      const { roomId } = await context.params;

      const member = await validateMembership(user.id, roomId);
      if (!member) {
        return Response.json(
          { error: "You are not a member of this room" },
          { status: 403 },
        );
      }

      await query("DELETE FROM shapes WHERE room_id = $1", [roomId]);

      return Response.json({ message: "All shapes cleared" });
    } catch (error) {
      console.error("Failed to clear shapes:", error);
      return Response.json(
        { error: "Failed to clear shapes" },
        { status: 500 },
      );
    }
  },
);
