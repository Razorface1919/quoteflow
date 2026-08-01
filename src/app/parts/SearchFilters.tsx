"use client";

import { useSearchParams } from "next/navigation";

interface SearchFiltersProps {
  categories?: string[];
}

export default function SearchFilters({ categories = [] }: SearchFiltersProps) {
  const searchParams = useSearchParams();
  const query = searchParams.get("query") || "";
  const category = searchParams.get("category") || "";

  return (
    <div className="flex gap-4">
      <input
        type="text"
        name="query"
        defaultValue={query}
        placeholder="Search parts..."
        className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
      />
      <select
        name="category"
        defaultValue={category}
        className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
      >
        <option value="">All Categories</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
      >
        Search
      </button>
    </div>
  );
}