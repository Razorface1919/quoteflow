import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Export the auth wrapper from NextAuth using only the Edge-compatible config
export default NextAuth(authConfig).auth;

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  // This regex targets all routes EXCEPT API routes, static Next.js files, and images
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};