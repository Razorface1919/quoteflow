import fs from "fs";
import path from "path";
import { db } from "./lib/db";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

// ==========================================
// 1. CONFIGURATION & TARGETS
// ==========================================
export interface SeedTarget {
  category: string;
  searchTerms: string[];
  targetCount: number;
}

export const SEED_TARGETS: SeedTarget[] = [
  {
    category: "Capacitors",
    searchTerms: ["ceramic capacitor", "tantalum capacitor"],
    targetCount: 150,
  },
  {
    category: "Resistors",
    searchTerms: ["thick film resistor", "thin film resistor"],
    targetCount: 150,
  },
  {
    category: "Integrated Circuits",
    searchTerms: ["STM32 microcontroller", "operational amplifier"],
    targetCount: 125,
  },
  {
    category: "Connectors",
    searchTerms: ["RJ45 connector", "USB-C connector"],
    targetCount: 100,
  },
];
// Total Target = 525 parts across 4 distinct categories

const args = process.argv.slice(2);
const IS_OFFLINE = args.includes("--offline") || args.includes("--cache-only");
const IS_REFRESH = args.includes("--refresh");

const CACHE_DIR = path.resolve(process.cwd(), ".cache/mouser");
const FALLBACK_CSV_PATH = path.resolve(process.cwd(), "prisma/seeds/fallback_parts.csv");
const MOUSER_API_KEY = process.env.MOUSER_API_KEY;

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Audit Counters for summary table
const stats = {
  fetched: 0,
  insertedLive: 0,
  insertedCsv: 0,
  updated: 0,
  skippedDuplicate: 0,
  failed: 0,
};

// ==========================================
// 2. USER SEEDING (RBAC ROLES)
// ==========================================
async function seedUsers() {
  console.log("👤 Seeding users...");
  const defaultPassword = await bcrypt.hash("Password123!", 12);

  const users = [
    { email: "admin@quoteflow.io", name: "Admin User", password: defaultPassword, role: Role.ADMIN },
    { email: "manager@quoteflow.io", name: "Manager User", password: defaultPassword, role: Role.MANAGER },
    { email: "sales@quoteflow.io", name: "Sales User", password: defaultPassword, role: Role.SALES },
  ];

  for (const u of users) {
    const createdUser = await db.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, password: u.password },
      create: { email: u.email, name: u.name, role: u.role, password: u.password },
    });
    console.log(`  ✅ Upserted user: ${createdUser.email} (${createdUser.role})`);
  }
  console.log("👤 User seeding complete!\n");
}

// ==========================================
// 3. CUSTOMER SEEDING (INR + USD EDGE CASE)
// ==========================================
async function seedCustomers() {
  console.log("🏢 Seeding customers...");
  const defaultCustomers = [
    {
      companyName: "Bharat Aerospace & Defence Ltd",
      gstin: "07AAACB1234A1Z5",
      preferredCurrency: "INR",
      paymentTerms: "NET30",
      contacts: [
        { name: "Rajesh Sharma", email: "r.sharma@bharataero.in", phone: "+91 9876543210", isPrimary: true },
        { name: "Ananya Iyer", email: "procurement@bharataero.in", phone: "+91 9876543211", isPrimary: false },
      ],
    },
    {
      companyName: "Lockheed Defence Systems (APAC)",
      gstin: "99FOREIGNTAXID01",
      preferredCurrency: "USD",
      paymentTerms: "NET60",
      contacts: [
        { name: "John Miller", email: "j.miller@lockheedapac.com", phone: "+1 408 555 0199", isPrimary: true },
      ],
    },
    {
      companyName: "Vidyut Industrial Electronics",
      gstin: "27AAACV5678B1Z2",
      preferredCurrency: "INR",
      paymentTerms: "ADVANCE",
      contacts: [
        { name: "Vikram Patel", email: "vpatel@vidyut-ind.com", phone: "+91 9820012345", isPrimary: true },
      ],
    },
    {
      companyName: "Tejas Avionics Pvt Ltd",
      gstin: "29AAACT9012C1Z8",
      preferredCurrency: "INR",
      paymentTerms: "NET30",
      contacts: [
        { name: "Suresh Menon", email: "suresh@tejasavionics.com", phone: "+91 9845012345", isPrimary: true },
      ],
    },
    {
      companyName: "Agni Robotics India",
      gstin: "07AAACA3456D1Z1",
      preferredCurrency: "INR",
      paymentTerms: "NET15",
      contacts: [
        { name: "Neelam Verma", email: "nverma@agnirobotics.in", phone: "+91 9811012345", isPrimary: true },
      ],
    },
  ];

  for (const c of defaultCustomers) {
    const existing = await db.customer.findUnique({
      where: { companyName: c.companyName },
    });

    if (!existing) {
      await db.customer.create({
        data: {
          companyName: c.companyName,
          gstin: c.gstin,
          preferredCurrency: c.preferredCurrency,
          paymentTerms: c.paymentTerms,
          contacts: { create: c.contacts },
        },
      });
      console.log(`  ✅ Inserted customer: ${c.companyName} (${c.preferredCurrency})`);
    } else {
      console.log(`  [SKIPPED] Customer already exists: ${c.companyName}`);
    }
  }
  console.log("🏢 Customer seeding complete!\n");
}

// ==========================================
// 4. RETRY WITH BACKOFF & FETCH LOGIC
// ==========================================
async function fetchWithRetry(url: string, body: any, retries = 3, delayMs = 2000): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.status === 429) {
        console.warn(`[RATE LIMIT 429] Too Many Requests. Exponential backoff for ${delayMs * 2}ms...`);
        await new Promise((res) => setTimeout(res, delayMs * 2));
        continue;
      }

      if (!response.ok) {
        throw new Error(`API Error ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      if (attempt === retries) throw error;
      console.warn(`[RETRY] Attempt ${attempt} failed (${error.message}). Waiting ${delayMs}ms...`);
      await new Promise((res) => setTimeout(res, delayMs));
      delayMs *= 2; // Exponential backoff
    }
  }
}

async function getMouserParts(searchTerm: string, category: string, page = 1): Promise<any[]> {
  const slugTerm = searchTerm.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const slugCat = category.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const cacheFile = path.join(CACHE_DIR, `${slugCat}-${slugTerm}-page-${page}.json`);

  // 1. Read from local cache if available
  if (fs.existsSync(cacheFile) && !IS_REFRESH) {
    console.log(`[CACHED] Read ${path.basename(cacheFile)}`);
    const cachedData = fs.readFileSync(cacheFile, "utf-8");
    return JSON.parse(cachedData);
  }

  // 2. Offline check
  if (IS_OFFLINE) {
    console.warn(`[OFFLINE] Cache miss for ${path.basename(cacheFile)}. Skipping fetch.`);
    return [];
  }

  // 3. API Fetch
  if (!MOUSER_API_KEY) {
    console.warn("[WARN] MOUSER_API_KEY is not set. Cannot fetch live Mouser parts.");
    return [];
  }

  const url = `https://api.mouser.com/api/v1/search/keyword?apiKey=${MOUSER_API_KEY}`;
  const payload = {
    SearchByKeywordRequest: {
      keyword: searchTerm,
      records: 50,
      pageNumber: page,
      searchOptions: "InStock",
    },
  };

  console.log(`[FETCHING] Mouser API: "${searchTerm}" (Page ${page})...`);
  try {
    const data = await fetchWithRetry(url, payload);
    const parts = data?.SearchResults?.Parts || [];

    if (parts.length > 0) {
      fs.writeFileSync(cacheFile, JSON.stringify(parts, null, 2), "utf-8");
      console.log(`[CACHED] Saved ${parts.length} parts to ${path.basename(cacheFile)}`);
    }
    stats.fetched += parts.length;
    return parts;
  } catch (error: any) {
    console.error(`[FAILED] Mouser API call failed for "${searchTerm}":`, error.message);
    return [];
  }
}

// ==========================================
// 5. DATA NORMALIZER
// ==========================================
function normalizeMouserPart(raw: any, category: string) {
  let price = 10.0;
  if (raw.PriceBreaks && raw.PriceBreaks.length > 0) {
    const rawPriceStr = raw.PriceBreaks[0].Price || "";
    const cleaned = rawPriceStr.replace(/[^0-9.]/g, "");
    if (cleaned) price = parseFloat(cleaned);
  }

  const stock = parseInt(raw.Availability?.replace(/[^0-9]/g, "") || "100", 10);

  return {
    manufacturer: raw.Manufacturer || "Unknown Vendor",
    manufacturerPartNum: raw.ManufacturerPartNumber || `UNK-${Date.now()}`,
    description: (raw.Description || "No description available").slice(0, 255),
    category: category,
    unitPrice: price,
    stockQuantity: isNaN(stock) ? 50 : stock,
    dataSheetUrl: raw.DataSheetUrl || null,
    mouserPartNumber: raw.MouserPartNumber || null,
  };
}

// ==========================================
// 6. DATABASE UPSERT (IDEMPOTENT)
// ==========================================
async function upsertPartToDb(partData: ReturnType<typeof normalizeMouserPart>, source: "LIVE" | "CSV") {
  try {
    const existing = await db.part.findUnique({
      where: {
        manufacturer_manufacturerPartNum: {
          manufacturer: partData.manufacturer,
          manufacturerPartNum: partData.manufacturerPartNum,
        },
      },
    });

    if (existing) {
      await db.part.update({
        where: { id: existing.id },
        data: {
          unitPrice: partData.unitPrice,
          stockQuantity: partData.stockQuantity,
          updatedAt: new Date(),
        },
      });
      stats.skippedDuplicate++;
      console.log(`[SKIPPED/UPDATED] ${partData.manufacturer} - ${partData.manufacturerPartNum}`);
    } else {
      await db.part.create({ data: partData });
      if (source === "LIVE") stats.insertedLive++;
      else stats.insertedCsv++;
      console.log(`[INSERTED-${source}] ${partData.manufacturer} - ${partData.manufacturerPartNum}`);
    }
  } catch (error: any) {
    stats.failed++;
    console.error(`[FAILED] Could not upsert ${partData.manufacturer} - ${partData.manufacturerPartNum}:`, error.message);
  }
}

// ==========================================
// 7. CSV TOP-UP FALLBACK PARSER
// ==========================================
async function runCsvFallback() {
  if (!fs.existsSync(FALLBACK_CSV_PATH)) {
    console.warn(`[SKIP CSV] Fallback file not found at ${FALLBACK_CSV_PATH}`);
    return;
  }

  console.log("\n--- [TOP-UP] Triggering CSV Fallback Ingestion ---");
  const csvContent = fs.readFileSync(FALLBACK_CSV_PATH, "utf-8");
  const lines = csvContent.split("\n").filter((l) => l.trim().length > 0);

  // Assumes Header: manufacturer,manufacturerPartNum,description,category,unitPrice,stockQuantity
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (cols.length < 4) continue;

    const partData = {
      manufacturer: cols[0],
      manufacturerPartNum: cols[1],
      description: cols[2] || "CSV Imported Component",
      category: cols[3] || "General",
      unitPrice: parseFloat(cols[4]) || 10.0,
      stockQuantity: parseInt(cols[5], 10) || 100,
      dataSheetUrl: null,
      mouserPartNumber: null,
    };

    await upsertPartToDb(partData, "CSV");
  }
}

// ==========================================
// 8. MAIN ORCHESTRATOR
// ==========================================
async function main() {
  console.log("==========================================");
  console.log("    QUOTEFLOW - PARTS SEEDING PIPELINE    ");
  console.log("==========================================");
  console.log(`Mode: ${IS_OFFLINE ? "OFFLINE (Cache-Only)" : IS_REFRESH ? "FORCE REFRESH" : "NORMAL (Cache-First)"}\n`);

  // 1. Seed Users First
  await seedUsers();

  // 2. Seed Customers (INR + USD Multi-Currency Edge Cases)
  await seedCustomers();

  // 3. Process Target Categories via Live Mouser API / Cache
  console.log("🔧 Seeding parts catalog from live Mouser API...");

  for (const target of SEED_TARGETS) {
    console.log(`\n---> Processing Category: ${target.category} (Target: ${target.targetCount})`);
    let categoryCount = 0;
    let page = 1;

    for (const term of target.searchTerms) {
      while (categoryCount < target.targetCount && page <= 3) {
        const rawParts = await getMouserParts(term, target.category, page);
        if (rawParts.length === 0) break;

        for (const raw of rawParts) {
          const normalized = normalizeMouserPart(raw, target.category);
          await upsertPartToDb(normalized, "LIVE");
          categoryCount++;
        }
        page++;
      }
      page = 1; // Reset page for next search term
    }
  }

  // 4. Enforce 500-Part Minimum via CSV Top-up
  const totalDbParts = await db.part.count();
  console.log(`\nCurrent Database Total after Live API: ${totalDbParts} parts.`);

  if (totalDbParts < 500) {
    console.log(`[ALERT] Total below 500 threshold (${totalDbParts}/500). Running CSV Top-up...`);
    await runCsvFallback();
  }

  const finalCount = await db.part.count();

  // 5. Summary Audit Table
  console.log("\n==========================================");
  console.log("           SEEDING SUMMARY AUDIT          ");
  console.log("==========================================");
  console.table({
    "API Parts Fetched": stats.fetched,
    "Live API Inserted": stats.insertedLive,
    "CSV Top-up Inserted": stats.insertedCsv,
    "Duplicates Skipped/Updated": stats.skippedDuplicate,
    "Failed Upserts": stats.failed,
    "FINAL DB TOTAL PARTS": finalCount,
  });
  console.log("==========================================\n");

  console.log(`📄 NOTE FOR README/DEBUG_JOURNAL:`);
  console.log(`   - Live API Parts: ${stats.insertedLive}`);
  console.log(`   - CSV Top-Up Parts: ${stats.insertedCsv}`);
  console.log(`   - Total Parts: ${finalCount}`);
}

main()
  .catch((err) => {
    console.error("Fatal Seeding Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });