"use client";

import React, { useState, useTransition } from "react";
import { deleteCustomer } from "@/app/actions/customers";

export default function DeleteCustomerButton({
  customerId,
  quoteCount,
}: {
  customerId: string;
  quoteCount: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDelete = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await deleteCustomer(customerId);
      if (res && "error" in res && res.error) {
        setErrorMessage(res.error);
        setShowConfirm(false);
      }
    });
  };

  // Disable button if customer has quotes (server action also enforces this)
  const hasQuotes = quoteCount > 0;

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2 justify-end">
        <button
          disabled={isPending}
          onClick={() => setShowConfirm(false)}
          className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          disabled={isPending}
          onClick={handleDelete}
          className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {isPending ? "Deleting..." : "Confirm Delete"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        disabled={hasQuotes || isPending}
        onClick={() => setShowConfirm(true)}
        className="rounded bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-red-100 hover:text-red-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-red-900/30 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
        title={hasQuotes ? "Cannot delete customer with existing quotes" : "Delete customer"}
      >
        Delete
      </button>
      {errorMessage && (
        <p className="text-xs font-medium text-red-600 max-w-[200px] text-right">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
