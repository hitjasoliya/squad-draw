import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "squad_session";

const protectedRoutes = ["/dashboard"];

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  const res = NextResponse.next();

  const isLoggedIn = !!sessionCookie;
  const isOnProtectedRoute = protectedRoutes.some(
    (route) =>
      nextUrl.pathname === route || nextUrl.pathname.startsWith(route + "/"),
  );
  const isOnRoomRoute = nextUrl.pathname.startsWith("/room");
  const isOnAuthRoute =
    nextUrl.pathname === "/signin" || nextUrl.pathname === "/signup";

  if ((isOnProtectedRoute || isOnRoomRoute) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  if (isOnAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (nextUrl.pathname === "/" && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
