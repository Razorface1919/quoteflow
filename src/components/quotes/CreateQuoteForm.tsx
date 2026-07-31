"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createQuote } from "@/app/actions/quotes";

interface Customer {
  id: string;
  companyName: string;
  preferredCurrency: string;
}

interface Part {
  id: string;
  manufacturer: string;
  manufacturerPartNum: string;
  description: string;
  unitPrice: number;
  stockQuantity: number;
}

interface LineItem {
  partId: string;
  quantity: number;
  unitPrice: number;
  marginPercent: number;
  overrideReason: string;
}

export default function CreateQuoteForm({
  customers,
  parts,
  userId,
}: {
  customers: Customer[];
  parts: Part[];
  userId: string;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(18);
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [items, setItems] = useState<LineItem[]>([
    {
      partId: parts[0]?.id || "",
      quantity: 1,
      unitPrice: parts[0]?.unitPrice || 0,
      marginPercent: 0,
      overrideReason: "",
    },
  ]);

  // Map parts for quick lookup
  const partMap = useMemo(() => {
    return new Map(parts.map((p) => [p.id, p]));
  }, [parts]);

  // Live total calculations (Zero-clamped)
  const computedTotals = useMemo(() => {
    let subtotal = 0;
    for (const item of items) {
      subtotal += Math.max(0, item.quantity * item.unitPrice);
    }
    const discountAmount = Math.max(0, subtotal * (discountPercent / 100));
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Math.max(0, taxableAmount * (taxRate / 100));
    const grandTotal = Math.max(0, taxableAmount + taxAmount);

    return {
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
    };
  }, [items, discountPercent, taxRate]);

  // Check if any item triggers the >10% override rule
  const requiresOverrideReason = (item: LineItem) => {
    const p = partMap.get(item.partId);
    if (!p) return false;
    // True if selling price is below 90% of list price
    return item.unitPrice < p.unitPrice * 0.9;
  };

  const handleAddItem = () => {
    if (parts.length === 0) return;
    const firstPart = parts[0];
    setItems((prev) => [
      ...prev,
      {
        partId: firstPart.id,
        quantity: 1,
        unitPrice: firstPart.unitPrice,
        marginPercent: 0,
        overrideReason: "",
      },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof LineItem, val: any) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: val };
        // Auto-update price when part changes
        if (field === "partId") {
          const p = partMap.get(val);
          if (p) updated.unitPrice = p.unitPrice;
        }
        return updated;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate Override Reasons
    for (const item of items) {
      if (requiresOverrideReason(item) && !item.overrideReason.trim()) {
        setErrorMsg(
          "A price override reason is mandatory when discounting a line item by more than 10% below list price."
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await createQuote({
        customerId,
        createdById: userId,
        discountPercent,
        taxRate,
        notes,
        validUntil,
        items: items.map((i) => ({
          partId: i.partId,
          quantity: i.quantity,
          marginPercent: 0, // Using unit price override
        })),
      });
      router.push("/quotes");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create quotation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 shadow-sm ring-1 ring-zinc-200 rounded-lg dark:bg-zinc-900 dark:ring-zinc-800">
      {errorMsg && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Top Meta Data */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Customer Account
          </label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName} ({c.preferredCurrency})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Valid Until Date
          </label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            GST Rate (%)
          </label>
          <input
            type="number"
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
      </div>

      {/* Line Items Section */}
      <div>
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Line Items
          </h3>
          <button
            type="button"
            onClick={handleAddItem}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
          >
            + Add Part
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {items.map((item, idx) => {
            const p = partMap.get(item.partId);
            const isDiscountedHeavy = requiresOverrideReason(item);

            return (
              <div
                key={idx}
                className="grid grid-cols-1 items-end gap-3 rounded-md border border-zinc-200 p-4 sm:grid-cols-12 dark:border-zinc-800"
              >
                {/* Part Dropdown */}
                <div className="sm:col-span-4">
                  <label className="block text-xs font-medium text-zinc-500">
                    Select Component
                  </label>
                  <select
                    value={item.partId}
                    onChange={(e) => updateItem(idx, "partId", e.target.value)}
                    className="mt-1 block w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    {parts.map((part) => (
                      <option key={part.id} value={part.id}>
                        {part.manufacturerPartNum} — {part.manufacturer}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-500">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(idx, "quantity", parseInt(e.target.value, 10) || 1)
                    }
                    className="mt-1 block w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>

                {/* Selling Unit Price */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-500">
                    Unit Price (INR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)
                    }
                    className="mt-1 block w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>

                {/* Line Total Display */}
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-zinc-500">
                    Line Total
                  </label>
                  <div className="mt-1.5 text-sm font-semibold">
                    INR {(item.quantity * item.unitPrice).toFixed(2)}
                  </div>
                </div>

                {/* Remove Line */}
                <div className="sm:col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={items.length === 1}
                    className="text-red-600 hover:text-red-800 disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>

                {/* Mandatory Override Reason Gate */}
                {isDiscountedHeavy && (
                  <div className="sm:col-span-12 mt-2">
                    <label className="block text-xs font-medium text-amber-700 dark:text-amber-400">
                      ⚠️ Selling price is &gt;10% below list price (INR {p?.unitPrice}). Override justification required:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., High-volume customer commitment, competitors matched price..."
                      value={item.overrideReason}
                      onChange={(e) =>
                        updateItem(idx, "overrideReason", e.target.value)
                      }
                      required
                      className="mt-1 block w-full rounded border border-amber-400 bg-amber-50 px-2.5 py-1 text-sm dark:border-amber-600 dark:bg-amber-950/40"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Totals Breakdown */}
      <div className="flex flex-col items-end border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <div className="w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">Subtotal:</span>
            <span className="font-medium">INR {computedTotals.subtotal}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">Quote Discount (%):</span>
            <input
              type="number"
              min="0"
              max="100"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value))}
              className="w-16 rounded border border-zinc-300 px-1 py-0.5 text-right dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <div className="flex justify-between text-zinc-500">
            <span>Discount Amount:</span>
            <span>- INR {computedTotals.discountAmount}</span>
          </div>
          <div className="flex justify-between text-zinc-500">
            <span>GST ({taxRate}%):</span>
            <span>+ INR {computedTotals.taxAmount}</span>
          </div>
          <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-bold dark:border-zinc-800">
            <span>Grand Total:</span>
            <span>INR {computedTotals.grandTotal}</span>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {isSubmitting ? "Creating..." : "Save Quotation"}
        </button>
      </div>
    </form>
  );
}