import { db } from "@/lib/db";
import { deletePart } from "@/app/actions/parts";
import MouserImportForm from "./MouserImportForm";
import PartForm from "./PartForm";
import Link from "next/link";

interface PartsPageProps {
  searchParams: {
    query?: string;
    category?: string;
  };
}

export default async function PartsPage({ searchParams }: PartsPageProps) {
  const query = searchParams?.query || "";
  const category = searchParams?.category || "";

  // Dynamic Prisma query filter
  const parts = await db.part.findMany({
    where: {
      AND: [
        query
          ? {
              OR: [
                { mouserPartNumber: { contains: query, mode: "insensitive" } },
                { manufacturerPartNum: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
              ],
            }
          : {},
        category ? { category: { equals: category } } : {},
      ],
    },
    orderBy: { updatedAt: "desc" },
  });

  // Collect unique categories for the filter dropdown
  const categories = await db.part.findMany({
    select: { category: true },
    distinct: ["category"],
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Parts Catalog</h1>
        <span className="text-sm text-gray-500">Total Parts: {parts.length}</span>
      </div>

{/* Quick Mouser Import Bar */}
      <MouserImportForm />
      {/* Add / Upsert Form */}
      <PartForm />

      {/* Search & Category Filter Header */}
      <form method="GET" className="flex gap-3 items-center">
        <input
          name="query"
          defaultValue={query}
          placeholder="Search by Part # or Description..."
          className="border p-2 rounded text-sm w-80 bg-transparent"
        />
        <select
          name="category"
          defaultValue={category}
          className="border p-2 rounded text-sm bg-transparent"
        >
          <option value="">All Categories</option>
          {categories.map(
            (c) =>
              c.category && (
                <option key={c.category} value={c.category}>
                  {c.category}
                </option>
              )
          )}
        </select>
        <button
          type="submit"
          className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 transition"
        >
          Filter
        </button>
        {(query || category) && (
          <Link
            href="/parts"
            className="text-sm text-red-600 underline ml-2"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Parts List Table */}
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800 border-b">
            <tr>
              <th className="p-3">Mouser Part #</th>
              <th className="p-3">Mfr Part #</th>
              <th className="p-3">Manufacturer</th>
              <th className="p-3">Category</th>
              <th className="p-3">Description</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {parts.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-500">
                  No parts found matching your criteria.
                </td>
              </tr>
            ) : (
              parts.map((part) => (
                <tr key={part.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3 font-mono">{part.mouserPartNumber}</td>
                  <td className="p-3 font-mono">{part.manufacturerPartNum}</td>
                  <td className="p-3">{part.manufacturer}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-xs">
                      {part.category || "N/A"}
                    </span>
                  </td>
                  <td className="p-3 max-w-xs truncate">{part.description}</td>
                  <td className="p-3">${part.unitPrice.toFixed(4)}</td>
                  <td className="p-3">{part.stockQuantity}</td>
                  <td className="p-3">
                    <form
                      action={async () => {
                        "use server";
                        await deletePart(part.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="text-red-600 hover:underline text-xs"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}