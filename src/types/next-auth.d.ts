import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface User {
    role: "ADMIN" | "MANAGER" | "SALES"
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: "ADMIN" | "MANAGER" | "SALES"
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: "ADMIN" | "MANAGER" | "SALES"
  }
}
