// middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    // When unauthenticated, go to landing with ?callbackUrl=<original>
    signIn: "/",
  },
});

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/settings",
    "/settings/:path*",
    "/account",
    "/account/:path*",
  ],
};
