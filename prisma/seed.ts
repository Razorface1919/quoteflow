import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config"; // Ensure process.env.DATABASE_URL is loaded

// Create a connection pool using your connection string
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing users to prevent duplicate key errors during testing
  await prisma.user.deleteMany();

  const defaultPassword = await bcrypt.hash("Password123!", 12);

  const users = [
    {
      email: "admin@quoteflow.io",
      name: "Admin User",
      password: defaultPassword,
      role: Role.ADMIN,
    },
    {
      email: "manager@quoteflow.io",
      name: "Manager User",
      password: defaultPassword,
      role: Role.MANAGER,
    },
    {
      email: "sales@quoteflow.io",
      name: "Sales User",
      password: defaultPassword,
      role: Role.SALES,
    },
  ];

  for (const u of users) {
    const createdUser = await prisma.user.create({
      data: u,
    });
    console.log(`✅ Created user: ${createdUser.email} (${createdUser.role})`);
  }

  console.log("🌱 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end(); // Cleanly close the database connection pool
  });

// Inside your seed script
const sampleParts = [
  {
    mouserPartNumber: "595-SN74HC00N",
    manufacturer: "Texas Instruments",
    manufacturerPartNum: "SN74HC00N",
    description: "NAND Gate 4-Element 2-IN PDIP-14",
    category: "Integrated Circuits",
    unitPrice: 0.45,
    stockQuantity: 1500,
  },
  {
    mouserPartNumber: "581-SR215C104KAR",
    manufacturer: "KYOCERA AVX",
    manufacturerPartNum: "SR215C104KAR",
    description: "Multilayer Ceramic Capacitors MLCC - Leaded 50V 0.1uF 10% Radial",
    category: "Capacitors",
    unitPrice: 0.12,
    stockQuantity: 5000,
  },
];

for (const part of sampleParts) {
  await prisma.part.upsert({
    where: {
      manufacturer_manufacturerPartNum: {
        manufacturer: part.manufacturer,
        manufacturerPartNum: part.manufacturerPartNum,
      },
    },
    update: part,
    create: part,
  });
}