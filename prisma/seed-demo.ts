import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  console.log("🌱 Seeding 10 Demo Quotes across all states...");

  // 0. Clean up any existing demo quotes so the script is idempotent!
  await db.quote.deleteMany({
    where: {
      quoteNumber: {
        startsWith: "QT-DEMO-",
      },
    },
  });

  // 1. Grab existing seeded customers, parts, and a user for createdById
  const customers = await db.customer.findMany({ take: 5 });
  const parts = await db.part.findMany({ take: 10 });
  const user = await db.user.findFirst();

  if (customers.length === 0 || parts.length === 0) {
    throw new Error("Please make sure your database has at least 1 customer and 1 part first!");
  }

  if (!user) {
    throw new Error("No user found in DB! Please make sure at least 1 user exists for createdById.");
  }

  const statuses = [
    "DRAFT",
    "PENDING_APPROVAL",
    "APPROVED",
    "SENT",
    "CLOSED_WON",
    "CLOSED_LOST",
    "EXPIRED",
  ];

  // 2. Create 10 Base Quotes covering the statuses
  for (let i = 0; i < 10; i++) {
    const status = statuses[i % statuses.length];
    const isExpiredTarget = status === "EXPIRED";

    const validUntil = new Date();
    if (isExpiredTarget) {
      validUntil.setDate(validUntil.getDate() - 5); // 5 days in the past
    } else {
      validUntil.setDate(validUntil.getDate() + 14); // 14 days in the future
    }

    const customer = customers[i % customers.length];
    const part = parts[i % parts.length];

    const quote = await db.quote.create({
      data: {
        quoteNumber: `QT-DEMO-202607-${100 + i}`,
        version: 1,
        status: status as any,
        subtotal: Number(part.unitPrice) * 10,
        discountPercent: 5,
        taxRate: 18,
        totalAmount: Number(part.unitPrice) * 10 * 0.95 * 1.18,
        validUntil: validUntil,
        customerId: customer.id,
        createdById: user.id, // Safely using an existing User ID
        lineItems: {
          create: [
            {
              partNumber: part.manufacturerPartNum,
              description: part.description,
              quantity: 10,
              listPrice: Number(part.unitPrice),
              unitPrice: Number(part.unitPrice),
              discountPercent: 5,
              discountAmount: 0,
              totalPrice: Number(part.unitPrice) * 10,
              leadTimeDays: 14,
              overrideReason: "Standard volume tier",
            },
          ],
        },
      },
    });

    // 3. For Quote #1 (i=0), create 3 historical revisions to demo the Diff Modal!
    if (i === 0) {
      console.log(`📑 Creating 3 revision snapshots for Quote ${quote.quoteNumber}...`);
      for (let rev = 2; rev <= 4; rev++) {
        await db.quote.create({
          data: {
            quoteNumber: quote.quoteNumber,
            version: rev,
            status: "DRAFT",
            subtotal: Number(part.unitPrice) * (10 + rev * 5),
            discountPercent: rev === 4 ? 12 : 5,
            taxRate: 18,
            totalAmount: Number(part.unitPrice) * (10 + rev * 5),
            validUntil: new Date(Date.now() + 864000000 * rev),
            customerId: customer.id,
            createdById: user.id,
            lineItems: {
              create: [
                {
                  partNumber: part.manufacturerPartNum,
                  description: part.description,
                  quantity: 10 + rev * 5,
                  listPrice: Number(part.unitPrice),
                  unitPrice: Number(part.unitPrice),
                  discountPercent: rev === 4 ? 12 : 5,
                  discountAmount: 0,
                  totalPrice: Number(part.unitPrice) * (10 + rev * 5),
                  leadTimeDays: 14,
                  overrideReason: rev === 4 ? "Executive deal approval > 10%" : "Standard tier",
                },
              ],
            },
          },
        });
      }
    }
  }

  console.log("✅ Successfully seeded 10 demo quotes, expired records, and revision histories!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });