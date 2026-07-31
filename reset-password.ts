import "dotenv/config";
import { db } from "./src/lib/db";
import bcrypt from "bcryptjs"; // or "bcrypt" depending on what is in your package.json

async function main() {
  // 1. Check who is currently in the DB
  const existingUsers = await db.user.findMany({
    select: { id: true, email: true, role: true, name: true },
  });

  if (existingUsers.length === 0) {
    console.log("❌ No users found in the database! Did your Day 1/2 seed run?");
    console.log("👉 Try running your seed command first (e.g., `npm run seed` or `npx prisma db seed`).");
    return;
  }

  // 2. Hash "password123" properly
  const hashedPassword = await bcrypt.hash("password123", 10);

  // 3. Update all existing users so you can log in with ANY account
  await db.user.updateMany({
    data: {
      password: hashedPassword,
    },
  });

  console.log("✅ Successfully reset all user passwords to: password123");
  console.log("==========================================");
  console.log("   AVAILABLE LOGIN ACCOUNTS");
  console.log("==========================================");
  console.table(
    existingUsers.map((u) => ({
      Email: u.email,
      Role: u.role,
      Name: u.name || "N/A",
      Password: "password123",
    }))
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });