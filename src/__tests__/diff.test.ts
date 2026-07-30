import { describe, it, expect } from "vitest";
import { calculateRevisionDiff, QuoteRevisionSnapshot } from "../lib/diff";

describe("Revision Diff Engine (Section 4 Spec)", () => {
  const v1: QuoteRevisionSnapshot = {
    version: 1,
    subtotal: 1000,
    totalAmount: 1180,
    lineItems: [
      { partNumber: "IC-1", description: "Chip A", quantity: 10, unitPrice: 50, totalPrice: 500 },
      { partNumber: "IC-2", description: "Chip B", quantity: 5, unitPrice: 100, totalPrice: 500 },
    ],
  };

  const v2: QuoteRevisionSnapshot = {
    version: 2,
    subtotal: 1300,
    totalAmount: 1534,
    lineItems: [
      { partNumber: "IC-1", description: "Chip A", quantity: 15, unitPrice: 50, totalPrice: 750 }, // MODIFIED (qty increased)
      // IC-2 REMOVED
      { partNumber: "IC-3", description: "Chip C", quantity: 1, unitPrice: 550, totalPrice: 550 }, // ADDED
    ],
  };

  it("should accurately identify ADDED, REMOVED, and MODIFIED line items between versions", () => {
    const diff = calculateRevisionDiff(v1, v2);

    expect(diff.fromVersion).toBe(1);
    expect(diff.toVersion).toBe(2);
    expect(diff.subtotalDelta).toBe(300); // 1300 - 1000
    
    const ic1 = diff.lineItemChanges.find((item) => item.partNumber === "IC-1");
    const ic2 = diff.lineItemChanges.find((item) => item.partNumber === "IC-2");
    const ic3 = diff.lineItemChanges.find((item) => item.partNumber === "IC-3");

    expect(ic1?.status).toBe("MODIFIED");
    expect(ic1?.oldQuantity).toBe(10);
    expect(ic1?.newQuantity).toBe(15);

    expect(ic2?.status).toBe("REMOVED");
    expect(ic3?.status).toBe("ADDED");
  });
});