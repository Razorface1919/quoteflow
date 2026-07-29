import { db } from "./lib/db";
import { searchMouserPart } from "./lib/mouser";

// Testing with our cached offline part to ensure deterministic seeding
const INITIAL_PART_QUERIES = [
  "SN74HC00N", // IC - Quad 2-Input NAND Gate (TI) - Available in .cache/mouser/
];

async function main() {
  console.log("🌱 Starting automated bulk catalog seed...");

  let seededCount = 0;

  for (const query of INITIAL_PART_QUERIES) {
    try {
      console.log(`\n🔍 Searching (or reading disk cache) for: ${query}...`);
      const results = await searchMouserPart(query);

      if (!results || results.length === 0) {
        console.warn(`  ⚠️ No results found for "${query}". Skipping.`);
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

      // Idempotent upsert by our new composite natural key!
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

      console.log(`  ✅ Successfully upserted: [${manufacturer}] ${manufacturerPartNum} ($${price.toFixed(2)})`);
      seededCount++;
    } catch (err: any) {
      console.error(`  ❌ Failed to seed "${query}":`, err.message || err);
    }
  }

  console.log(`\n🎉 Bulk seeding complete! Successfully seeded ${seededCount} parts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });