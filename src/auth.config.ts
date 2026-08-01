import type { NextAuthConfig } from "next-auth";
import { Role } from "@prisma/client";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // 1. Transfer the role from the authenticated user to the JWT token
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    
    // 2. Transfer the role from the JWT token to the active client session
    async session({ session, token }) {
      if (session.user && token.role) {
        session.user.role = token.role as Role;
      }
      return session;
    },

    // 3. Your existing route protection logic
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtectedRoute = 
        nextUrl.pathname.startsWith("/parts") || 
        nextUrl.pathname.startsWith("/quotes");

      if (isProtectedRoute) {
        if (isLoggedIn) return true;
        return false; // Redirects unauthenticated users to the signIn page
      } 
      
      // If a logged-in user tries to access the login page, redirect them to the app
      if (isLoggedIn && nextUrl.pathname.startsWith("/login")) {
        return Response.redirect(new URL("/parts", nextUrl));
      }
      
      return true;
    },
  },
  providers: [], // We will inject the actual providers in the Node.js file
} satisfies NextAuthConfig;