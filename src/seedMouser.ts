import { db } from "@/lib/db";
import { searchMouserPart } from "@/lib/mouser";

const SEARCH_QUERIES = [
  "SN74HC00N",
  "NE555P",
  "LM317T",
  "ATMEGA328P-PU",
];

async function main() {
  console.log("Starting Mouser API Seed Routine...");

  for (const query of SEARCH_QUERIES) {
    console.log(`\nProcessing search query: ${query}`);
    const results = await searchMouserPart(query);

    for (const item of results) {
      if (!item.MouserPartNumber || !item.ManufacturerPartNumber) continue;

      // Extract unit price if available
      let price = 0.0;
      if (item.PriceBreaks && item.PriceBreaks.length > 0) {
        const rawPrice = item.PriceBreaks[0].Price?.replace("$", "") || "0";
        price = parseFloat(rawPrice) || 0.0;
      }

      const partData = {
        mouserPartNumber: item.MouserPartNumber,
        manufacturer: item.Manufacturer || "Unknown",
        manufacturerPartNum: item.ManufacturerPartNumber,
        description: item.Description || "No description provided.",
        category: item.Category || "General Component",
        unitPrice: price,
        stockQuantity: 100, // Default seed stock
        dataSheetUrl: item.DataSheetUrl || null,
      };

      // Idempotent upsert
      await db.part.upsert({
        where: {
          manufacturer_manufacturerPartNum: {
            manufacturer: partData.manufacturer,
            manufacturerPartNum: partData.manufacturerPartNum,
          },
        },
        update: partData,
        create: partData,
      });

      console.log(`  ✓ Upserted Part: ${partData.mouserPartNumber} (${partData.manufacturerPartNum})`);
    }
  }

  console.log("\nMouser API seeding complete!");
}

main()
  .catch((e) => {
    console.error("Error running Mouser seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });