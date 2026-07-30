export interface LineItemSnapshot {
  partNumber: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface QuoteRevisionSnapshot {
  version: number;
  subtotal: number;
  totalAmount: number;
  lineItems: LineItemSnapshot[];
}

export interface LineItemDiff {
  partNumber: string;
  description: string;
  status: "ADDED" | "REMOVED" | "MODIFIED" | "UNCHANGED";
  oldQuantity?: number;
  newQuantity?: number;
  oldUnitPrice?: number;
  newUnitPrice?: number;
  oldTotalPrice?: number;
  newTotalPrice?: number;
}

export interface RevisionDiffResult {
  fromVersion: number;
  toVersion: number;
  subtotalDelta: number;
  totalAmountDelta: number;
  lineItemChanges: LineItemDiff[];
}

/**
 * Compares two quote revision snapshots and generates a structured diff
 * of line item changes and financial delta summaries.
 */
export function calculateRevisionDiff(
  oldQuote: QuoteRevisionSnapshot,
  newQuote: QuoteRevisionSnapshot
): RevisionDiffResult {
  const lineItemChanges: LineItemDiff[] = [];
  const oldMap = new Map(oldQuote.lineItems.map((item) => [item.partNumber, item]));
  const newMap = new Map(newQuote.lineItems.map((item) => [item.partNumber, item]));

  // 1. Check for ADDED, MODIFIED, or UNCHANGED items
  for (const [partNumber, newItem] of newMap.entries()) {
    const oldItem = oldMap.get(partNumber);
    const newQty = Number(newItem.quantity);
    const newPrice = Number(newItem.unitPrice);
    const newTotal = Number(newItem.totalPrice);

    if (!oldItem) {
      lineItemChanges.push({
        partNumber,
        description: newItem.description,
        status: "ADDED",
        newQuantity: newQty,
        newUnitPrice: newPrice,
        newTotalPrice: newTotal,
      });
    } else {
      const oldQty = Number(oldItem.quantity);
      const oldPrice = Number(oldItem.unitPrice);
      const oldTotal = Number(oldItem.totalPrice);

      const isModified =
        oldQty !== newQty ||
        Math.abs(oldPrice - newPrice) > 0.0001 ||
        Math.abs(oldTotal - newTotal) > 0.0001;

      lineItemChanges.push({
        partNumber,
        description: newItem.description,
        status: isModified ? "MODIFIED" : "UNCHANGED",
        oldQuantity: oldQty,
        newQuantity: newQty,
        oldUnitPrice: oldPrice,
        newUnitPrice: newPrice,
        oldTotalPrice: oldTotal,
        newTotalPrice: newTotal,
      });
    }
  }

  // 2. Check for REMOVED items
  for (const [partNumber, oldItem] of oldMap.entries()) {
    if (!newMap.has(partNumber)) {
      lineItemChanges.push({
        partNumber,
        description: oldItem.description,
        status: "REMOVED",
        oldQuantity: Number(oldItem.quantity),
        oldUnitPrice: Number(oldItem.unitPrice),
        oldTotalPrice: Number(oldItem.totalPrice),
      });
    }
  }

  // 3. Compute overall financial deltas
  const subtotalDelta = Number(newQuote.subtotal) - Number(oldQuote.subtotal);
  const totalAmountDelta = Number(newQuote.totalAmount) - Number(oldQuote.totalAmount);

  return {
    fromVersion: oldQuote.version,
    toVersion: newQuote.version,
    subtotalDelta: Math.round((subtotalDelta + Number.EPSILON) * 100) / 100,
    totalAmountDelta: Math.round((totalAmountDelta + Number.EPSILON) * 100) / 100,
    lineItemChanges,
  };
}