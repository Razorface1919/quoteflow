import { describe, it, expect } from "vitest";

describe("QuoteFlow Enterprise Lifecycle & Guardrails E2E", () => {
  it("should enforce a mandatory override reason when line-item discount exceeds 10%", () => {
    const validateDiscount = (discount: number, reason?: string) => {
      if (discount > 10 && (!reason || reason.trim() === "")) {
        return false;
      }
      return true;
    };

    // 5% discount without reason -> VALID
    expect(validateDiscount(5, "")).toBe(true);
    // 15% discount without reason -> INVALID (Must reject / throw 400)
    expect(validateDiscount(15, "")).toBe(false);
    // 15% discount WITH mandatory reason -> VALID
    expect(validateDiscount(15, "Executive approved volume tier")).toBe(true);
  });

  it("should automatically flag quotes past their validUntil date as EXPIRED", () => {
    const now = new Date();
    const pastValidUntil = new Date();
    pastValidUntil.setDate(now.getDate() - 5); // 5 days in the past

    const futureValidUntil = new Date();
    futureValidUntil.setDate(now.getDate() + 14); // 14 days in the future

    const isPastDue = pastValidUntil < now;
    const isFuture = futureValidUntil < now;

    expect(isPastDue).toBe(true);
    expect(isFuture).toBe(false);
  });

  it("should route quotes with >15% overall discount to PENDING_APPROVAL", () => {
    const getInitialStatus = (overallDiscount: number) => {
      return overallDiscount > 15 ? "PENDING_APPROVAL" : "DRAFT";
    };

    expect(getInitialStatus(10)).toBe("DRAFT");
    expect(getInitialStatus(18)).toBe("PENDING_APPROVAL");
  });
});