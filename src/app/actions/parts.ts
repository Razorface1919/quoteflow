"use server";

import { db } from "@/lib/db";

export async function getParts(searchQuery?: string, categoryFilter?: string) {
  try {
    const parts = await db.part.findMany({
      where: {
        AND: [
          // Filter by category if one is provided
          categoryFilter ? { category: categoryFilter } : {},
          // Search across multiple text fields if a query is provided
          searchQuery
            ? {
                OR: [
                  { manufacturerPartNum: { contains: searchQuery, mode: "insensitive" } },
                  { manufacturer: { contains: searchQuery, mode: "insensitive" } },
                  { description: { contains: searchQuery, mode: "insensitive" } },
                ],
              }
            : {},
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    return parts;
  } catch (error) {
    console.error("Failed to fetch parts:", error);
    throw new Error("Failed to load parts catalogue.");
  }
}

export async function upsertPart(formData: FormData) {
  const mouserPartNumber = formData.get("mouserPartNumber") as string;
  const manufacturer = formData.get("manufacturer") as string;
  const manufacturerPartNum = formData.get("manufacturerPartNum") as string;
  const category = formData.get("category") as string || "Integrated Circuits (ICs)";
  const unitPrice = formData.get("unitPrice") ? parseFloat(formData.get("unitPrice") as string) : 0.0;
  const stockQuantity = formData.get("stockQuantity") ? parseInt(formData.get("stockQuantity") as string) : 0;
  const description = formData.get("description") as string;

  try {
    await db.part.upsert({
      where: { 
        manufacturer_manufacturerPartNum: {
          manufacturer,
          manufacturerPartNum
        }
      },
      update: {
        mouserPartNumber,
        category,
        unitPrice,
        stockQuantity,
        description,
      },
      create: {
        mouserPartNumber,
        manufacturer,
        manufacturerPartNum,
        category,
        unitPrice,
        stockQuantity,
        description,
      },
    });
  } catch (error) {
    console.error("Failed to upsert part:", error);
    throw new Error("Failed to save part.");
  }
}

export async function importPartFromMouser(formData: FormData) {
  const mouserQuery = formData.get("mouserQuery") as string;

  try {
    // TODO: Implement actual Mouser API integration
    // For now, this is a placeholder that would need to be implemented
    // with the Mouser API to fetch part data
    throw new Error("Mouser API integration not yet implemented");
  } catch (error) {
    console.error("Failed to import part from Mouser:", error);
    throw new Error("Failed to import part from Mouser.");
  }
}

export async function getUniqueCategories() {
  try {
    const categories = await db.part.findMany({
      select: { category: true },
      distinct: ['category'],
    });

    // Extract the strings, remove any null/empty values, and sort them alphabetically
    return categories
      .map((c) => c.category)
      .filter((c): c is string => Boolean(c))
      .sort();
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return [];
  }
}