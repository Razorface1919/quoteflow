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
          overrideReason: i.overrideReason,
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
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-5xl space-y-6 pb-12">
      
      

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
          {errorMsg}
        </div>
      )}

      {/* 1. Client & Terms Section */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-[#121212]">
        <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800/50">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Client & Terms</h2>
          <p className="text-sm text-zinc-500">Select the customer account and define quotation validity.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Customer Account</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} ({c.preferredCurrency})
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Valid Until Date</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">GST Rate (%)</label>
            <input
              type="number"
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>
      </div>

      {/* 2. Bill of Materials Section */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-[#121212]">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-zinc-100 px-6 py-4 sm:flex-row sm:items-center dark:border-zinc-800/50">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Bill of Materials</h2>
            <p className="text-sm text-zinc-500">Add catalog components and apply price overrides if necessary.</p>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Add Part
          </button>
        </div>
        
        <div className="p-6">
          {/* Desktop Table Header */}
          <div className="mb-3 hidden grid-cols-12 gap-4 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 md:grid">
            <div className="col-span-5">Component</div>
            <div className="col-span-2">Qty</div>
            <div className="col-span-2">Unit Price</div>
            <div className="col-span-2 text-right">Line Total</div>
            <div className="col-span-1 text-center">Action</div>
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => {
              const p = partMap.get(item.partId);
              const isDiscountedHeavy = requiresOverrideReason(item);

              return (
                <div
                  key={idx}
                  className="group relative grid grid-cols-1 items-start gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 transition-colors hover:bg-zinc-100 md:grid-cols-12 md:items-center md:bg-transparent md:hover:bg-zinc-50 dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:hover:bg-zinc-800/40 md:dark:bg-transparent"
                >
                  {/* Part Selection */}
                  <div className="space-y-1.5 md:col-span-5 md:space-y-0">
                    <label className="text-xs font-semibold uppercase text-zinc-500 md:hidden">Component</label>
                    <select
                      value={item.partId}
                      onChange={(e) => updateItem(idx, "partId", e.target.value)}
                      className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    >
                      {parts.map((part) => (
                        <option key={part.id} value={part.id}>
                          {part.manufacturerPartNum} — {part.manufacturer}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="space-y-1.5 md:col-span-2 md:space-y-0">
                    <label className="text-xs font-semibold uppercase text-zinc-500 md:hidden">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value, 10) || 1)}
                      className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="space-y-1.5 md:col-span-2 md:space-y-0">
                    <label className="text-xs font-semibold uppercase text-zinc-500 md:hidden">Unit Price (INR)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                      className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </div>

                  {/* Line Total */}
                  <div className="space-y-1.5 md:col-span-2 md:space-y-0 md:text-right">
                    <label className="text-xs font-semibold uppercase text-zinc-500 md:hidden">Line Total</label>
                    <div className="text-sm font-semibold text-zinc-900 md:py-2 dark:text-zinc-100">
                      INR {(item.quantity * item.unitPrice).toFixed(2)}
                    </div>
                  </div>

                  {/* Remove Action */}
                  <div className="absolute right-4 top-4 flex justify-end md:static md:col-span-1 md:justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length === 1}
                      className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                      title="Remove Part"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>

                  {/* Mandatory Override Reason Gate */}
                  {isDiscountedHeavy && (
                    <div className="mt-2 md:col-span-12">
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                          Selling price is &gt;10% below list price (INR {p?.unitPrice}). Justification required for approval.
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Competitor match, high-volume commitment..."
                          value={item.overrideReason}
                          onChange={(e) => updateItem(idx, "overrideReason", e.target.value)}
                          required
                          className="h-9 w-full rounded border border-amber-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-amber-700/50 dark:bg-zinc-950 dark:text-zinc-100 placeholder:dark:text-zinc-600"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Financial Summary & Actions */}
      <div className="flex flex-col items-end gap-6 md:flex-row md:items-start md:justify-end">
        <div className="w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 shadow-sm md:w-80 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="space-y-3 p-6 text-sm">
            <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
              <span>Subtotal:</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-200">INR {computedTotals.subtotal}</span>
            </div>
            
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
              <span>Quote Discount (%):</span>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="h-8 w-20 rounded border border-zinc-300 bg-white px-2 text-right text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
              <span>Discount Amount:</span>
              <span className="text-red-600 dark:text-red-400">- INR {computedTotals.discountAmount}</span>
            </div>

            <div className="flex justify-between border-b border-zinc-200 pb-3 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <span>GST ({taxRate}%):</span>
              <span className="text-zinc-900 dark:text-zinc-200">+ INR {computedTotals.taxAmount}</span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-base font-semibold text-zinc-900 dark:text-white">Grand Total:</span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">INR {computedTotals.grandTotal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-zinc-300 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-zinc-900 px-8 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
        >
          {isSubmitting ? "Saving..." : "Save Quotation"}
        </button>
      </div>

    </form>
  );
}