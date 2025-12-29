// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Public paths that do NOT require auth
const PUBLIC_PATHS = [
  "/", // landing
  "/login", // dev login
  "/auth/check-email", // check-email screen
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Never run auth checks for NextAuth routes or Next.js internals
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml")
  ) {
    return NextResponse.next();
  }

  // Allow public pages
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Protect these app routes (adjust as needed)
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/leagues") ||
    pathname.startsWith("/settings");

  if (!isProtected) return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  });

  if (token) return NextResponse.next();

  // Redirect to landing with a safe callbackUrl
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // IMPORTANT: explicitly exclude /api/auth and Next.js internals
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
