"use client";

import React, { useState, useTransition } from "react";
import { QuoteStatus } from "@prisma/client";
import { updateQuoteStatus } from "@/app/actions/quotes";
import { MoreHorizontal, Clock, Send, CheckCircle, XCircle, RotateCcw, FileCheck, XOctagon } from "lucide-react";

// Assuming you have shadcn/ui installed for these:
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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

  // Status Badge Colors (Slightly refined for darker enterprise theme consistency)
  const badgeColors: Record<string, string> = {
    DRAFT: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    PENDING_APPROVAL: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    APPROVED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    SENT: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    UNDER_NEGOTIATION: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    ACCEPTED: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    ORDER_PLACED: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    CLOSED_WON: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    CLOSED_LOST: "bg-red-500/10 text-red-500 border-red-500/20",
    REJECTED: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    EXPIRED: "bg-zinc-500/10 text-zinc-500 line-through border-zinc-500/20",
    ARCHIVED: "bg-zinc-800 text-zinc-500 border-zinc-700",
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

  // Determine if there are actually any actions available for this user/status
  const hasActions =
    currentStatus === "DRAFT" ||
    (currentStatus === "PENDING_APPROVAL" && isManagerOrAdmin) ||
    currentStatus === "APPROVED" ||
    currentStatus === "SENT" ||
    currentStatus === "UNDER_NEGOTIATION" ||
    currentStatus === "REJECTED" ||
    currentStatus === "CLOSED_LOST" ||
    currentStatus === "EXPIRED";

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center justify-between gap-3 min-w-[200px]">
        {/* Visual Status Badge */}
        <span
          className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold tracking-wide ${
            badgeColors[currentStatus] || "bg-zinc-800 text-zinc-400 border-zinc-700"
          }`}
        >
          {currentStatus.replace(/_/g, " ")}
        </span>

        {/* Action Controls Hidden in Dropdown */}
        {hasActions && (
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={isPending}
              className="h-8 w-8 text-slate-400 hover:text-white data-[state=open]:bg-slate-800 inline-flex items-center justify-center rounded-md hover:bg-slate-800"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open status actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-slate-800 text-slate-300">
              <DropdownMenuLabel className="text-xs text-slate-500">Update Status</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-800" />

              {/* DRAFT Actions */}
              {currentStatus === "DRAFT" && (
                <>
                  <DropdownMenuItem 
                    onClick={() => handleStatusChange("PENDING_APPROVAL" as QuoteStatus)}
                    className="focus:bg-slate-800 focus:text-amber-400 cursor-pointer"
                  >
                    <Clock className="mr-2 h-4 w-4" /> Request Approval
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleStatusChange("SENT" as QuoteStatus)}
                    className="focus:bg-slate-800 focus:text-blue-400 cursor-pointer"
                  >
                    <Send className="mr-2 h-4 w-4" /> Mark as Sent
                  </DropdownMenuItem>
                </>
              )}

              {/* PENDING_APPROVAL Actions */}
              {currentStatus === "PENDING_APPROVAL" && isManagerOrAdmin && (
                <>
                  <DropdownMenuItem 
                    onClick={() => handleStatusChange("APPROVED" as QuoteStatus)}
                    className="focus:bg-slate-800 focus:text-emerald-400 cursor-pointer"
                  >
                    <FileCheck className="mr-2 h-4 w-4" /> Approve Quote
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleStatusChange("REJECTED" as QuoteStatus)}
                    className="focus:bg-slate-800 focus:text-rose-400 cursor-pointer"
                  >
                    <XOctagon className="mr-2 h-4 w-4" /> Reject Quote
                  </DropdownMenuItem>
                </>
              )}

              {/* APPROVED Actions */}
              {currentStatus === "APPROVED" && (
                <DropdownMenuItem 
                  onClick={() => handleStatusChange("SENT" as QuoteStatus)}
                  className="focus:bg-slate-800 focus:text-blue-400 cursor-pointer"
                >
                  <Send className="mr-2 h-4 w-4" /> Mark as Sent
                </DropdownMenuItem>
              )}

              {/* SENT / UNDER_NEGOTIATION Actions */}
              {(currentStatus === "SENT" || currentStatus === "UNDER_NEGOTIATION") && (
                <>
                  <DropdownMenuItem 
                    onClick={() => handleStatusChange("CLOSED_WON" as QuoteStatus)}
                    className="focus:bg-slate-800 focus:text-emerald-500 cursor-pointer"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" /> Closed Won
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleStatusChange("CLOSED_LOST" as QuoteStatus)}
                    className="focus:bg-slate-800 focus:text-red-500 cursor-pointer"
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Closed Lost
                  </DropdownMenuItem>
                </>
              )}

              {/* REOPEN Actions */}
              {(currentStatus === "REJECTED" || currentStatus === "CLOSED_LOST" || currentStatus === "EXPIRED") && (
                <DropdownMenuItem 
                  onClick={() => handleStatusChange("DRAFT" as QuoteStatus)}
                  className="focus:bg-slate-800 focus:text-white cursor-pointer"
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Reopen as Draft
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Error Feedback */}
      {errorMessage && (
        <p className="text-xs font-medium text-red-500 mt-1">{errorMessage}</p>
      )}
    </div>
  );
}