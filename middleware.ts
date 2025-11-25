// middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/", // Redirect unauthenticated users to landing
  },
});

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/leagues",
    "/leagues/:path*",
    "/settings",
    "/settings/:path*",
    "/account",
    "/account/:path*",
  ],
};
