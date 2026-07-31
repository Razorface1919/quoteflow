"use client";

import React, { useState } from "react";
import RevisionDiffModal, { DiffItem } from "./RevisionDiffModal";
import { calculateRevisionDiff, QuoteRevisionSnapshot } from "@/lib/diff";

interface RevisionDiffWrapperProps {
  quoteNumber: string;
  revisions: any[];
  currentVersion: number;
}

export default function RevisionDiffWrapper({
  quoteNumber,
  revisions,
  currentVersion,
}: RevisionDiffWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [versionOld, setVersionOld] = useState<number>(
    revisions.length > 1 ? revisions[0].version : currentVersion
  );
  const [versionNew, setVersionNew] = useState<number>(currentVersion);

  // Convert Prisma quote data to snapshot format
  const toSnapshot = (quote: any): QuoteRevisionSnapshot => ({
    version: quote.version,
    subtotal: Number(quote.subtotal),
    totalAmount: Number(quote.totalAmount),
    lineItems: quote.lineItems.map((item: any) => ({
      partNumber: item.partNumber,
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.listPrice),
      totalPrice: Number(item.totalPrice),
    })),
  });

  // Get selected quote versions
  const oldQuote = revisions.find((r) => r.version === versionOld);
  const newQuote = revisions.find((r) => r.version === versionNew);

  // Calculate diff
  const diffResult =
    oldQuote && newQuote
      ? calculateRevisionDiff(toSnapshot(oldQuote), toSnapshot(newQuote))
      : null;

  // Convert LineItemDiff to DiffItem format expected by modal
  const diffItems: DiffItem[] =
    diffResult?.lineItemChanges.map((change) => ({
      partNumber: change.partNumber,
      description: change.description,
      type: change.status,
      oldPrice: change.oldUnitPrice,
      newPrice: change.newUnitPrice,
      oldQty: change.oldQuantity,
      newQty: change.newQuantity,
    })) || [];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
      >
        Compare Revisions
      </button>

      <RevisionDiffModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        diffItems={diffItems}
        versionOld={versionOld}
        versionNew={versionNew}
        quoteNumber={quoteNumber}
        oldTotal={oldQuote ? Number(oldQuote.totalAmount) : undefined}
        newTotal={newQuote ? Number(newQuote.totalAmount) : undefined}
      />
    </>
  );
}
