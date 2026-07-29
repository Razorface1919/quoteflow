import { db } from "./lib/db";
import { searchMouserPart } from "./lib/mouser";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

// Part queries to seed from Mouser API (uses offline cache when available)
const PART_QUERIES = [
  "SN74HC00N", // IC - Quad 2-Input NAND Gate (TI)
  "NE555P",    // Timer IC
  "LM317T",    // Voltage Regulator
  "ATMEGA328P-PU", // Microcontroller
];

async function seedUsers() {
  console.log("👤 Seeding users...");

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
    // Idempotent upsert by unique email address
    const createdUser = await db.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        password: u.password,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        password: u.password,
      },
    });
    console.log(`  ✅ Upserted user: ${createdUser.email} (${createdUser.role})`);
  }

  console.log("👤 User seeding complete!");
}

async function seedParts() {
  console.log("🔧 Seeding parts from Mouser API...");

  let seededCount = 0;

  for (const query of PART_QUERIES) {
    try {
      console.log(`\n  🔍 Searching (or reading disk cache) for: ${query}...`);
      const results = await searchMouserPart(query);

      if (!results || results.length === 0) {
        console.warn(`    ⚠️ No results found for "${query}". Skipping.`);
        continue;
      }

      const item = results[0];

      // Parse unit price
      let price = 0.50; // default fallback price
      if (item.PriceBreaks && item.PriceBreaks.length > 0) {
        const rawPrice = item.PriceBreaks[0].Price?.replace("$", "") || "0";
        price = parseFloat(rawPrice) || 0.50;
      }

      const manufacturer = item.Manufacturer || "Unknown";
      const manufacturerPartNum = item.ManufacturerPartNumber || query;

      // Idempotent upsert by composite natural key
      await db.part.upsert({
        where: {
          manufacturer_manufacturerPartNum: {
            manufacturer,
            manufacturerPartNum,
          },
        },
        update: {
          mouserPartNumber: item.MouserPartNumber,
          description: item.Description || "No description provided.",
          category: item.Category || "Integrated Circuits (ICs)",
          unitPrice: price,
        },
        create: {
          mouserPartNumber: item.MouserPartNumber,
          manufacturer,
          manufacturerPartNum,
          description: item.Description || "No description provided.",
          category: item.Category || "Integrated Circuits (ICs)",
          unitPrice: price,
          stockQuantity: 250, // Seed realistic inventory
          dataSheetUrl: item.DataSheetUrl || null,
        },
      });

      console.log(`    ✅ Successfully upserted: [${manufacturer}] ${manufacturerPartNum} ($${price.toFixed(2)})`);
      seededCount++;
    } catch (err: any) {
      console.error(`    ❌ Failed to seed "${query}":`, err.message || err);
    }
  }

  console.log(`\n🔧 Part seeding complete! Successfully seeded ${seededCount} parts.`);
}

async function main() {
  console.log("🌱 Starting database seed...\n");

  await seedUsers();
  console.log();
  await seedParts();

  console.log("\n🎉 Database seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });