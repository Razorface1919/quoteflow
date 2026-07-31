"use client";

import React, { useEffect } from "react";

export interface DiffItem {
  partNumber: string;
  description: string;
  type: "ADDED" | "REMOVED" | "MODIFIED" | "UNCHANGED";
  oldPrice?: number;
  newPrice?: number;
  oldQty?: number;
  newQty?: number;
}

interface RevisionDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  diffItems: DiffItem[];
  versionOld: number;
  versionNew: number;
  // Optional enterprise KPI additions:
  quoteNumber?: string;
  oldTotal?: number;
  newTotal?: number;
}

export default function RevisionDiffModal({
  isOpen,
  onClose,
  diffItems,
  versionOld,
  versionNew,
  quoteNumber,
  oldTotal,
  newTotal,
}: RevisionDiffModalProps) {
  // Allow closing modal via ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalDelta =
    typeof oldTotal === "number" && typeof newTotal === "number"
      ? newTotal - oldTotal
      : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* --- HEADER --- */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Revision Comparison {quoteNumber ? `• ${quoteNumber}` : ""}
            </h3>
            <p className="text-xs text-zinc-500">
              Comparing Version v{versionOld} → Version v{versionNew}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* --- KPI SUMMARY BAR (Renders if totals are passed) --- */}
        {typeof oldTotal === "number" && typeof newTotal === "number" && (
          <div className="grid grid-cols-3 gap-4 border-b border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
              <p className="text-xs font-medium text-zinc-500">
                Old Total (v{versionOld})
              </p>
              <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                INR {oldTotal.toFixed(2)}
              </p>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
              <p className="text-xs font-medium text-zinc-500">
                New Total (v{versionNew})
              </p>
              <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                INR {newTotal.toFixed(2)}
              </p>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
              <p className="text-xs font-medium text-zinc-500">Net Variance</p>
              <p
                className={`mt-1 text-lg font-bold ${
                  (totalDelta || 0) > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : (totalDelta || 0) < 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-zinc-500"
                }`}
              >
                {(totalDelta || 0) > 0 ? "+" : ""}
                INR {totalDelta?.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* --- LINE ITEMS DIFF LIST --- */}
        <div className="flex-1 space-y-2 overflow-y-auto p-6">
          {diffItems.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              No line item differences detected between these versions.
            </div>
          ) : (
            diffItems.map((item, idx) => {
              const isPriceChanged =
                item.oldPrice !== undefined &&
                item.newPrice !== undefined &&
                item.oldPrice !== item.newPrice;
              const isQtyChanged =
                item.oldQty !== undefined &&
                item.newQty !== undefined &&
                item.oldQty !== item.newQty;

              return (
                <div
                  key={idx}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between rounded-lg p-4 text-sm transition border ${
                    item.type === "ADDED"
                      ? "border-emerald-200 bg-emerald-50/80 border-l-4 border-l-emerald-500 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                      : item.type === "REMOVED"
                      ? "border-rose-200 bg-rose-50/80 border-l-4 border-l-rose-500 opacity-75 dark:border-rose-900/50 dark:bg-rose-950/20"
                      : item.type === "MODIFIED"
                      ? "border-amber-200 bg-amber-50/80 border-l-4 border-l-amber-500 dark:border-amber-900/50 dark:bg-amber-950/20"
                      : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/40"
                  }`}
                >
                  <div className="mb-2 sm:mb-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold ${
                          item.type === "REMOVED" ? "line-through" : ""
                        } text-zinc-900 dark:text-zinc-100`}
                      >
                        {item.partNumber}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                          item.type === "ADDED"
                            ? "bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300"
                            : item.type === "REMOVED"
                            ? "bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-300"
                            : item.type === "MODIFIED"
                            ? "bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                            : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {item.type}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {item.description}
                    </p>
                  </div>

                  {/* Dynamic Financials / Quantity Changes */}
                  <div className="text-left sm:text-right text-xs">
                    {item.type === "ADDED" && (
                      <div className="text-emerald-700 dark:text-emerald-400 font-medium">
                        Qty: <b>{item.newQty}</b> | Price: INR{" "}
                        <b>{item.newPrice?.toFixed(2)}</b>
                      </div>
                    )}

                    {item.type === "REMOVED" && (
                      <div className="text-rose-700 dark:text-rose-400 line-through">
                        Qty: {item.oldQty} | Price: INR{" "}
                        {item.oldPrice?.toFixed(2)}
                      </div>
                    )}

                    {item.type === "MODIFIED" && (
                      <div className="space-y-1 text-zinc-700 dark:text-zinc-300">
                        {isPriceChanged && (
                          <div>
                            Price:{" "}
                            <span className="line-through text-zinc-400">
                              INR {item.oldPrice?.toFixed(2)}
                            </span>{" "}
                            →{" "}
                            <span className="font-bold text-amber-600 dark:text-amber-400">
                              INR {item.newPrice?.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {isQtyChanged && (
                          <div>
                            Qty:{" "}
                            <span className="line-through text-zinc-400">
                              {item.oldQty}
                            </span>{" "}
                            →{" "}
                            <span className="font-bold text-amber-600 dark:text-amber-400">
                              {item.newQty}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {item.type === "UNCHANGED" && (
                      <div className="text-zinc-400">
                        Qty: {item.oldQty} | INR {item.oldPrice?.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* --- FOOTER --- */}
        <div className="flex justify-end border-t border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <button
            onClick={onClose}
            className="rounded-md bg-black px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
          >
            Close Diff View
          </button>
        </div>
      </div>
    </div>
  );
}