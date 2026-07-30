import { describe, it, expect } from "vitest";
import { calculateQuotePricing } from "../lib/pricing";

describe("List-Price & Discounting Engine (Section 4.3 Spec)", () => {
  it("should correctly calculate line totals with percentage and absolute discounts", () => {
    const result = calculateQuotePricing({
      lineItems: [
        {
          partNumber: "IC-100",
          description: "Microcontroller",
          quantity: 10,
          listPrice: 100, // Total base: 1000
          discountPercent: 10, // -100
          discountAmount: 50, // -50 => Expected line total: 850
        },
      ],
    });

    expect(result.lineItems[0].totalPrice).toBe(850);
    expect(result.subtotal).toBe(850);
  });

  it("should throw an error if a unit price is overridden below the threshold without an overrideReason", () => {
    expect(() =>
      calculateQuotePricing({
        lineItems: [
          {
            partNumber: "IC-100",
            description: "Microcontroller",
            quantity: 1,
            listPrice: 100,
            unitPrice: 85, // 15% discount (exceeds default 10% threshold)
            overrideReason: "", // MISSING REASON -> Should throw!
          },
        ],
      })
    ).toThrowError(/exceeds 10% threshold/);
  });

  it("should allow a price override below threshold if an overrideReason is provided", () => {
    const result = calculateQuotePricing({
      lineItems: [
        {
          partNumber: "IC-100",
          description: "Microcontroller",
          quantity: 1,
          listPrice: 100,
          unitPrice: 80, // 20% discount
          overrideReason: "Strategic tier-1 customer account discount",
        },
      ],
    });

    expect(result.lineItems[0].unitPrice).toBe(80);
    expect(result.subtotal).toBe(80);
  });

  it("should enforce zero-clamping so heavy discounts never result in negative totals", () => {
    const result = calculateQuotePricing({
      lineItems: [
        {
          partNumber: "CONN-01",
          description: "Connector",
          quantity: 1,
          listPrice: 10,
          discountAmount: 500, // Excessive absolute discount
        },
      ],
      quoteDiscountPercent: 50,
    });

    expect(result.lineItems[0].totalPrice).toBe(0);
    expect(result.totalAmount).toBe(0);
  });
});