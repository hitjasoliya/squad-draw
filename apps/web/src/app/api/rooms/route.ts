import { NextRequest } from "next/server";
import { query, queryOne, transaction } from "@repo/db";
import { RoomNameSchema } from "@/schemas/index";
import { ZodError } from "zod";
import { withAuth } from "@/lib/auth-middleware";

const MAX_CREATED_ROOMS = 3;

export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const rooms = await query<{
      room_id: string;
      room_name: string;
      room_created_at: Date;
      room_updated_at: Date;
      room_is_shared: boolean;
      room_owner_id: string;
      user_role: string;
      owner_id: string;
      owner_name: string;
      owner_email: string;
      member_count: string;
      shape_count: string;
      message_count: string;
    }>(
      `SELECT
        r.id as room_id,
        r.name as room_name,
        r.created_at as room_created_at,
        r.updated_at as room_updated_at,
        r.is_shared as room_is_shared,
        r.owner_id as room_owner_id,
        rm.role as user_role,
        u.id as owner_id,
        u.name as owner_name,
        u.email as owner_email,
        COALESCE(mc.cnt, 0)::text as member_count,
        COALESCE(sc.cnt, 0)::text as shape_count,
        COALESCE(msgc.cnt, 0)::text as message_count
      FROM room_members rm
      JOIN rooms r ON rm.room_id = r.id
      JOIN users u ON r.owner_id = u.id
      LEFT JOIN (SELECT room_id, COUNT(*) as cnt FROM room_members GROUP BY room_id) mc ON mc.room_id = r.id
      LEFT JOIN (SELECT room_id, COUNT(*) as cnt FROM shapes GROUP BY room_id) sc ON sc.room_id = r.id
      LEFT JOIN (SELECT room_id, COUNT(*) as cnt FROM messages GROUP BY room_id) msgc ON msgc.room_id = r.id
      WHERE rm.user_id = $1
      ORDER BY r.updated_at DESC`,
      [user.id]
    );

    return Response.json({
      rooms: rooms.map((rm) => ({
        id: rm.room_id,
        name: rm.room_name,
        createdAt: new Date(rm.room_created_at).toISOString(),
        updatedAt: new Date(rm.room_updated_at).toISOString(),
        isShared: rm.room_is_shared,
        ownerId: rm.room_owner_id,
        userRole: rm.user_role,
        owner: {
          id: rm.owner_id,
          name: rm.owner_name,
          email: rm.owner_email,
        },
        memberCount: parseInt(rm.member_count),
        shapeCount: parseInt(rm.shape_count),
        messageCount: parseInt(rm.message_count),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch joined rooms:", error);
    return Response.json(
      { error: "Failed to fetch joined rooms" },
      { status: 500 },
    );
  }
});

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const name = RoomNameSchema.parse(body.name);

    const countResult = await queryOne<{ count: string }>(
      "SELECT COUNT(*)::text as count FROM rooms WHERE owner_id = $1",
      [user.id]
    );

    const userCreatedRoomsCount = parseInt(countResult?.count || "0");

    if (userCreatedRoomsCount >= MAX_CREATED_ROOMS) {
      return Response.json(
        {
          error: `You can only create up to ${MAX_CREATED_ROOMS} rooms. Please delete an existing room to create a new one.`,
          limit: MAX_CREATED_ROOMS,
          current: userCreatedRoomsCount,
        },
        { status: 400 },
      );
    }

    const result = await transaction(async (tx) => {
      const room = await tx.queryOne<{
        id: string;
        name: string;
        created_at: Date;
        updated_at: Date;
        owner_id: string;
        is_shared: boolean;
      }>(
        `INSERT INTO rooms (id, name, owner_id, created_at, updated_at)
         VALUES (gen_random_uuid()::text, $1, $2, NOW(), NOW())
         RETURNING id, name, created_at, updated_at, owner_id, is_shared`,
        [name, user.id]
      );

      if (!room) throw new Error("Failed to create room");

      await tx.query(
        `INSERT INTO room_members (id, room_id, user_id, role, joined_at)
         VALUES (gen_random_uuid()::text, $1, $2, 'ADMIN', NOW())`,
        [room.id, user.id]
      );

      return room;
    });

    return Response.json({
      room: {
        ...result,
        owner: {
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
    console.error("Failed to create room:", error);
    return Response.json({ error: "Failed to create room" }, { status: 500 });
  }
});
