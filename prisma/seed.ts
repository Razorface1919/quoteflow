import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Hash the default passwords securely
  const adminPasswordHash = await bcrypt.hash("password123", 10);
  const managerPasswordHash = await bcrypt.hash("password123", 10);
  const salesPasswordHash = await bcrypt.hash("password123", 10);

  // 1. Admin User Role
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@quoteflow.com" },
    update: { password: adminPasswordHash },
    create: {
      name: "System Administrator",
      email: "admin@quoteflow.com",
      password: adminPasswordHash,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });

  // 2. Manager User Role
  const managerUser = await prisma.user.upsert({
    where: { email: "manager@quoteflow.com" },
    update: { password: managerPasswordHash },
    create: {
      name: "Regional Manager",
      email: "manager@quoteflow.com",
      password: managerPasswordHash,
      role: "MANAGER",
      emailVerified: new Date(),
    },
  });

  // 3. Sales User Role
  const salesUser = await prisma.user.upsert({
    where: { email: "sales@quoteflow.com" },
    update: { password: salesPasswordHash },
    create: {
      name: "Sales Representative",
      email: "sales@quoteflow.com",
      password: salesPasswordHash,
      role: "SALES",
      emailVerified: new Date(),
    },
  });

  console.log("✅ Database seeded with hashed credentials!");
  console.log(`Admin Role:   ${adminUser.email}`);
  console.log(`Manager Role: ${managerUser.email}`);
  console.log(`Sales Role:   ${salesUser.email}`);
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });