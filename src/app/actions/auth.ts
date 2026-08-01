"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (!email || !password) {
    return "Please enter both email and password.";
  }

  // 1. Append the redirect route directly to the raw FormData object
  formData.append("redirectTo", "/");

  try {
    // 2. CRITICAL FIX: Pass the raw formData object directly to signIn.
    // Do NOT map it into a new { email, password } object.
    await signIn("credentials", formData);
    
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid email or password.";
        default:
          return "Authentication failed.";
      }
    }
    // Critical: NEXT_REDIRECT errors must be re-thrown for navigation to work
    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}