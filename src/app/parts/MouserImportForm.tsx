"use client";

import { useRef, useState } from "react";
import { importPartFromMouser } from "@/app/actions/parts";

export default function MouserImportForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImport(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      await importPartFromMouser(formData);
      formRef.current?.reset();
    } catch (err: any) {
      setError(err.message || "Failed to import part from Mouser.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 border rounded-md shadow-sm bg-gray-50 dark:bg-gray-800/50 mb-6">
      <form ref={formRef} action={handleImport} className="flex flex-wrap gap-3 items-center">
        <span className="text-sm font-semibold">Quick Import from Mouser (Disk-Cached):</span>
        <input
          name="mouserQuery"
          placeholder="e.g. SN74HC00N"
          required
          className="border p-2 rounded text-sm w-64 bg-white dark:bg-gray-900"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium transition"
        >
          {loading ? "Importing..." : "Import from Mouser"}
        </button>
      </form>
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  );
}