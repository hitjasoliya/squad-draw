import { Socket } from "socket.io";
import { parse } from "cookie";
import { queryOne } from "@repo/db";

export const authMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void,
) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) {
      return next(new Error("Authentication error: No cookies found"));
    }

    const cookies = parse(cookieHeader);
    const token = cookies["squad_session"];

    if (!token) {
      return next(new Error("Authentication error: No session token found"));
    }
    console.log("token", token);

    const foundSession = await queryOne<{
      session_id: string;
      expires_at: Date;
      user_id: string;
      user_name: string;
      user_email: string;
      user_image: string | null;
    }>(
      `SELECT s.id as session_id, s.expires_at,
              u.id as user_id, u.name as user_name, u.email as user_email, u.image as user_image
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1`,
      [token]
    );

    if (!foundSession) {
      return next(new Error("Authentication error: Invalid session token"));
    }

    // Check if session is expired
    if (new Date(foundSession.expires_at) < new Date()) {
      return next(new Error("Authentication error: Session expired"));
    }

    socket.data.user = {
      id: foundSession.user_id,
      name: foundSession.user_name,
      email: foundSession.user_email,
      image: foundSession.user_image,
    };
    socket.data.currentRoom = null;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return next(new Error("Authentication error: Failed to validate session"));
  }
};
