"use client";

import { useRef } from "react";
import { upsertPart } from "@/app/actions/parts";

export default function PartForm() {
  const formRef = useRef<HTMLFormElement>(null);

  async function clientAction(formData: FormData) {
    await upsertPart(formData);
    formRef.current?.reset();
  }

  return (
    <form
      ref={formRef}
      action={clientAction}
      className="p-4 border rounded-md shadow-sm bg-white dark:bg-gray-800 space-y-3 mb-6"
    >
      <h2 className="text-lg font-semibold">Add / Update Part (Upsert)</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          name="mouserPartNumber"
          placeholder="Mouser Part # (e.g. 595-SN74HC00N)"
          required
          className="border p-2 rounded text-sm bg-transparent"
        />
        <input
          name="manufacturer"
          placeholder="Manufacturer"
          required
          className="border p-2 rounded text-sm bg-transparent"
        />
        <input
          name="manufacturerPartNum"
          placeholder="Mfr Part #"
          required
          className="border p-2 rounded text-sm bg-transparent"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          name="category"
          placeholder="Category (e.g. ICs)"
          className="border p-2 rounded text-sm bg-transparent"
        />
        <input
          name="unitPrice"
          type="number"
          step="0.0001"
          placeholder="Unit Price ($)"
          className="border p-2 rounded text-sm bg-transparent"
        />
        <input
          name="stockQuantity"
          type="number"
          placeholder="Stock Qty"
          className="border p-2 rounded text-sm bg-transparent"
        />
      </div>
      <input
        name="description"
        placeholder="Part Description..."
        required
        className="w-full border p-2 rounded text-sm bg-transparent"
      />
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition"
      >
        Save Part
      </button>
    </form>
  );
}