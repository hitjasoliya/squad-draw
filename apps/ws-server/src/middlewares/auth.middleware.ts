import { Socket } from "socket.io";
import { parse } from "cookie";
import { prisma } from "@repo/db";

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
    const token =
      cookies["__Secure-better-auth.session_token"] ||  cookies["__Secure-better-auth.session"] || cookies["better-auth.session"] || cookies["better-auth.session_token"];

    if (!token) {
      return next(new Error("Authentication error: No session token found"));
    }
    console.log("token", token);
    const actialtoken = token.split(".")[0];

    const foundSession = await prisma.session.findUnique({
      where: {
        token: actialtoken,
      },
      include: {
        user: true,
      },
    });

    if (!foundSession) {
      return next(new Error("Authentication error: Invalid session token"));
    }

    // Check if session is expired
    if (foundSession.expiresAt < new Date()) {
      return next(new Error("Authentication error: Session expired"));
    }

    socket.data.user = foundSession.user;
    socket.data.currentRoom = null;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return next(new Error("Authentication error: Failed to validate session"));
  }
};
