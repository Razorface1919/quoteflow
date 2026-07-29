"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { searchMouserPart } from "@/lib/mouser";
import { auth } from "@/auth"; // <-- 1. Import your Auth.js v5 session helper

export async function upsertPart(formData: FormData) {
  // 2. Strict RBAC / Session Check
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized: You must be logged in to modify inventory.");
  }

  const mouserPartNumber = (formData.get("mouserPartNumber") as string) || null;
  const manufacturer = formData.get("manufacturer") as string;
  const manufacturerPartNum = formData.get("manufacturerPartNum") as string;
  const description = formData.get("description") as string;
  const category = (formData.get("category") as string) || "General";
  const unitPrice = parseFloat((formData.get("unitPrice") as string) || "0");
  const stockQuantity = parseInt((formData.get("stockQuantity") as string) || "0", 10);
  const dataSheetUrl = (formData.get("dataSheetUrl") as string) || null;

  // Only manufacturer and manufacturerPartNum are strictly required for our natural key!
  if (!manufacturer || !manufacturerPartNum) {
    throw new Error("Missing required part identifiers (Manufacturer and Mfr Part Number).");
  }

  // Idempotent upsert by composite natural key: [manufacturer, manufacturerPartNum]
  await db.part.upsert({
    where: {
      manufacturer_manufacturerPartNum: {
        manufacturer,
        manufacturerPartNum,
      },
    },
    update: {
      mouserPartNumber,
      description,
      category,
      unitPrice,
      stockQuantity,
      dataSheetUrl,
    },
    create: {
      mouserPartNumber,
      manufacturer,
      manufacturerPartNum,
      description,
      category,
      unitPrice,
      stockQuantity,
      dataSheetUrl,
    },
  });

  revalidatePath("/parts");
}

export async function deletePart(id: string) {
  // 2. Strict RBAC / Session Check
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized: You must be logged in to delete parts.");
  }

  await db.part.delete({
    where: { id },
  });
  revalidatePath("/parts");
}

export async function importPartFromMouser(formData: FormData) {
  // 2. Strict RBAC / Session Check
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized: You must be logged in to import parts.");
  }

  const query = (formData.get("mouserQuery") as string)?.trim();
  if (!query) return;

  const results = await searchMouserPart(query);

  if (!results || results.length === 0) {
    throw new Error(`No parts found in Mouser (or cache) for "${query}"`);
  }

  const item = results[0]; // Take the first matching result

  // Parse price if available in PriceBreaks
  let price = 0.0;
  if (item.PriceBreaks && item.PriceBreaks.length > 0) {
    const rawPrice = item.PriceBreaks[0].Price?.replace("$", "") || "0";
    price = parseFloat(rawPrice) || 0.0;
  }

  const manufacturer = item.Manufacturer || "Unknown";
  const manufacturerPartNum = item.ManufacturerPartNumber || item.MouserPartNumber;

  // Idempotent upsert by composite natural key: [manufacturer, manufacturerPartNum]
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
      dataSheetUrl: item.DataSheetUrl || null,
    },
    create: {
      mouserPartNumber: item.MouserPartNumber,
      manufacturer,
      manufacturerPartNum,
      description: item.Description || "No description provided.",
      category: item.Category || "Integrated Circuits (ICs)",
      unitPrice: price,
      stockQuantity: 100, // Default seed stock
      dataSheetUrl: item.DataSheetUrl || null,
    },
  });

  revalidatePath("/parts");
}