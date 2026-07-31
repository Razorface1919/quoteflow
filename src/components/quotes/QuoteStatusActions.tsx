"use client";

import React, { useState, useTransition } from "react";
import { QuoteStatus } from "@prisma/client";
import { updateQuoteStatus } from "@/app/actions/quotes";

export default function QuoteStatusActions({
  quoteId,
  currentStatus,
  userRole,
}: {
  quoteId: string;
  currentStatus: QuoteStatus;
  userRole: "ADMIN" | "MANAGER" | "SALES" | string;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Status Badge Colors
  const badgeColors: Record<string, string> = {
    DRAFT: "bg-zinc-100 text-zinc-800 border-zinc-300",
    PENDING_APPROVAL: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300",
    APPROVED: "bg-blue-100 text-blue-800 border-blue-300",
    SENT: "bg-purple-100 text-purple-800 border-purple-300",
    UNDER_NEGOTIATION: "bg-indigo-100 text-indigo-800 border-indigo-300",
    ACCEPTED: "bg-green-100 text-green-800 border-green-300",
    ORDER_PLACED: "bg-teal-100 text-teal-800 border-teal-300",
    CLOSED_WON: "bg-emerald-200 text-emerald-950 font-bold border-emerald-400",
    CLOSED_LOST: "bg-red-100 text-red-800 border-red-300",
    REJECTED: "bg-rose-100 text-rose-800 border-rose-300",
    EXPIRED: "bg-zinc-200 text-zinc-600 line-through border-zinc-300",
    ARCHIVED: "bg-zinc-100 text-zinc-400 border-zinc-200",
  };

  const handleStatusChange = (newStatus: QuoteStatus) => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await updateQuoteStatus(quoteId, newStatus);
      if (res && "error" in res && res.error) {
        setErrorMessage(res.error);
      }
    });
  };

  const isManagerOrAdmin = userRole === "ADMIN" || userRole === "MANAGER";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        {/* Visual Status Badge */}
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
            badgeColors[currentStatus] || "bg-zinc-100 text-zinc-800 border-zinc-300"
          }`}
        >
          {currentStatus.replace(/_/g, " ")}
        </span>

        {/* Role-Gated Action Controls */}
        {currentStatus === "DRAFT" && (
          <div className="flex gap-1">
            <button
              disabled={isPending}
              onClick={() => handleStatusChange("PENDING_APPROVAL" as QuoteStatus)}
              className="rounded bg-amber-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
            >
              Request Approval
            </button>
            <button
              disabled={isPending}
              onClick={() => handleStatusChange("SENT" as QuoteStatus)}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              Mark as Sent
            </button>
          </div>
        )}

        {currentStatus === "PENDING_APPROVAL" && isManagerOrAdmin && (
          <div className="flex gap-1">
            <button
              disabled={isPending}
              onClick={() => handleStatusChange("APPROVED" as QuoteStatus)}
              className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              Approve Quote
            </button>
            <button
              disabled={isPending}
              onClick={() => handleStatusChange("REJECTED" as QuoteStatus)}
              className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        )}

        {currentStatus === "APPROVED" && (
          <button
            disabled={isPending}
            onClick={() => handleStatusChange("SENT" as QuoteStatus)}
            className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            Mark as Sent
          </button>
        )}

        {(currentStatus === "SENT" || currentStatus === "UNDER_NEGOTIATION") && (
          <div className="flex gap-1">
            <button
              disabled={isPending}
              onClick={() => handleStatusChange("CLOSED_WON" as QuoteStatus)}
              className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              Closed Won
            </button>
            <button
              disabled={isPending}
              onClick={() => handleStatusChange("CLOSED_LOST" as QuoteStatus)}
              className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              Closed Lost
            </button>
          </div>
        )}

        {(currentStatus === "REJECTED" ||
          currentStatus === "CLOSED_LOST" ||
          currentStatus === "EXPIRED") && (
          <button
            disabled={isPending}
            onClick={() => handleStatusChange("DRAFT" as QuoteStatus)}
            className="rounded bg-zinc-800 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-zinc-900 disabled:opacity-50"
          >
            Reopen as Draft
          </button>
        )}
      </div>

      {/* Error Feedback */}
      {errorMessage && (
        <p className="text-xs font-medium text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}