import fs from "fs";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), ".cache", "mouser");

// Ensure cache directory exists
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

// Clean filename helper for caching search queries
function getCacheFilePath(query: string): string {
  const sanitized = query.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
  return path.join(CACHE_DIR, `${sanitized}.json`);
}

export interface MouserPartItem {
  MouserPartNumber: string;
  Manufacturer: string;
  ManufacturerPartNumber: string;
  Description: string;
  Category?: string;
  PriceBreaks?: Array<{ Price?: string; Quantity?: number }>;
  DataSheetUrl?: string;
}

export async function searchMouserPart(query: string): Promise<MouserPartItem[]> {
  if (!query) return [];

  ensureCacheDir();
  const cacheFile = getCacheFilePath(query);

  // 1. Check Disk Cache first
  if (fs.existsSync(cacheFile)) {
    try {
      const cachedRaw = fs.readFileSync(cacheFile, "utf-8");
      const cachedData = JSON.parse(cachedRaw);
      console.log(`[Mouser API] Cache HIT for query: "${query}"`);
      return cachedData.SearchResults?.Parts || [];
    } catch (e) {
      console.warn(`[Mouser API] Failed reading cache file for "${query}", fetching fresh data...`, e);
    }
  }

  // 2. Fetch from Mouser API if not cached
  const apiKey = process.env.MOUSER_API_KEY;
  if (!apiKey) {
    console.warn("[Mouser API] MOUSER_API_KEY is not set in environment variables.");
    return [];
  }

  const endpoint = `https://api.mouser.com/api/v1/search/partnumber?apiKey=${apiKey}`;

  try {
    console.log(`[Mouser API] Cache MISS. Fetching fresh data for query: "${query}"...`);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        SearchByOption: "PartNumber",
        mouserPartNumber: query,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mouser API returned status ${response.status}`);
    }

    const rawData = await response.json();

    // 3. Write Raw JSON to Disk Cache
    fs.writeFileSync(cacheFile, JSON.stringify(rawData, null, 2), "utf-8");
    console.log(`[Mouser API] Cached fresh response to disk for: "${query}"`);

    return rawData.SearchResults?.Parts || [];
  } catch (err) {
    console.error(`[Mouser API] Error fetching part "${query}":`, err);
    return [];
  }
}