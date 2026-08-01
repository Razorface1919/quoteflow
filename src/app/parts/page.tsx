import { getParts, getUniqueCategories } from "@/app/actions/parts";
import Link from "next/link";
import SearchFilters from "./SearchFilters";
import { auth } from "@/auth"; // <-- Import Auth.js configuration

export const dynamic = "force-dynamic";

export default async function PartsCataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; category?: string }>;
}) {
  const params = await searchParams;
  
  const query = params?.query || "";
  const category = params?.category || "";

  // 1. Fetch the active session to determine RBAC permissions
  const session = await auth();
  const userRole = session?.user?.role;
  const canManageCatalogue = userRole === "ADMIN" || userRole === "MANAGER";

  // 2. Fetch both parts and categories at the same time
  const [parts, categories] = await Promise.all([
    getParts(query, category),
    getUniqueCategories(),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Parts Catalogue</h1>
        
        {/* 3. Gate the creation action behind the RBAC check */}
        {canManageCatalogue && (
          <Link 
            href="/parts/new"
            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            + Add New Part
          </Link>
        )}
      </div>

      {/* Pass the categories into the SearchFilters component */}
      <SearchFilters categories={categories} />

      {/* The Data Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-950">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Part Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Manufacturer</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Category</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Unit Price</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {parts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                  No parts found matching your criteria.
                </td>
              </tr>
            ) : (
              parts.map((part) => (
                <tr key={part.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-6 py-4 font-medium text-blue-600 dark:text-blue-400">
                    <Link href={`/parts/${part.id}`}>{part.manufacturerPartNum}</Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-900 dark:text-zinc-300">{part.manufacturer}</td>
                  <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-500">{part.category}</td>
                  <td className="px-6 py-4 text-right text-sm text-zinc-900 dark:text-zinc-300">
                    ₹{part.unitPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      part.stockQuantity > 0 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {part.stockQuantity}
                    </span>
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