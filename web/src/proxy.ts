import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";

const SESSION_COOKIE_NAME = "squad_session";
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-in-prod";
const secretKey = new TextEncoder().encode(JWT_SECRET);

const protectedRoutes = ["/dashboard"];

export async function proxy(req: NextRequest) {
  const { nextUrl } = req;
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  const isOnProtectedRoute = protectedRoutes.some(
    (route) => nextUrl.pathname === route || nextUrl.pathname.startsWith(route + "/"),
  );
  const isOnRoomRoute = nextUrl.pathname.startsWith("/room");
  const isOnAuthRoute = nextUrl.pathname === "/signin" || nextUrl.pathname === "/signup";
  const isHomePage = nextUrl.pathname === "/";

  let isLoggedIn = false;

  if (sessionCookie) {
    try {
      const { payload } = await jose.jwtVerify(sessionCookie, secretKey, {
        algorithms: ["HS256"],
      });
      if (payload && payload.sub) {
        isLoggedIn = true;
      }
    } catch {
      isLoggedIn = false;
    }
  }

  if ((isOnProtectedRoute || isOnRoomRoute) && !isLoggedIn) {
    const signinUrl = new URL("/signin", req.url);
    signinUrl.searchParams.set("redirect", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(signinUrl);
  }

  if (isOnAuthRoute && isLoggedIn) {
    const redirectParam = nextUrl.searchParams.get("redirect");
    const destination = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/dashboard";
    return NextResponse.redirect(new URL(destination, req.url));
  }

  if (isHomePage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
