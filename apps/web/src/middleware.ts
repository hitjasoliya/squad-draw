import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "squad_session";

const protectedRoutes = ["/dashboard"];

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  const isOnProtectedRoute = protectedRoutes.some(
    (route) =>
      nextUrl.pathname === route || nextUrl.pathname.startsWith(route + "/"),
  );
  const isOnRoomRoute = nextUrl.pathname.startsWith("/room");
  const isOnAuthRoute =
    nextUrl.pathname === "/signin" || nextUrl.pathname === "/signup";
  const isHomePage = nextUrl.pathname === "/";

  let isLoggedIn = false;

  const needsSessionCheck =
    isOnProtectedRoute || isOnRoomRoute || isOnAuthRoute || isHomePage;

  if (needsSessionCheck && sessionCookie) {
    try {
      const response = await fetch(`${nextUrl.origin}/api/auth/session`, {
        headers: {
          Cookie: req.headers.get("cookie") || "",
        },
      });

      if (response.ok) {
        const data = await response.json();
        isLoggedIn = !!data?.user;
      }
    } catch (error) {
      console.error("Middleware session validation error:", error);
    }
  }

  if ((isOnProtectedRoute || isOnRoomRoute) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  if (isOnAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
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
