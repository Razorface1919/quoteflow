import { handlers } from "@/auth";

// MANDATORY: Force Node.js runtime so bcryptjs / crypto modules execute cleanly
export const runtime = "nodejs";

export const { GET, POST } = handlers;