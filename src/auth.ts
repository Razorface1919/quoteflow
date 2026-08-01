import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  debug: true, 
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("🚨 [AUTH.TS] AUTHORIZE FUNCTION HIT!");
        
        try {
          if (!credentials?.email) {
            console.log("❌ [AUTH.TS] Missing email payload.");
            return null;
          }

          console.log("⏳ [AUTH.TS] Querying Prisma for:", credentials.email);
          
          const user = await db.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user) {
            console.log("❌ [AUTH.TS] User not found in database.");
            return null;
          }

          // 🔓 THE BYPASS: We found the email, we don't care about the password.
          // Let them straight in so you can test your UI.
          console.log("🔓 [AUTH.TS] SECURITY BYPASSED: Forcing login for", user.email);
          
          return { 
            id: user.id, 
            email: user.email, 
            name: user.name, 
            role: user.role 
          };

        } catch (error) {
          console.error("🔥 [AUTH.TS] CRITICAL INTERNAL CRASH:", error);
          return null;
        }
      },
    }),
  ],
});