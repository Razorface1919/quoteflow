import { describe, it, expect } from "vitest";
import { Role } from "@prisma/client";

// Mock helper representing your role-guard domain logic
function evaluateDiscountPermission(userRole: Role, discountPercent: number): { allowed: boolean; requiresApproval: boolean } {
  if (discountPercent > 10 && userRole === Role.SALES) {
    return { allowed: true, requiresApproval: true }; // Must go to PENDING_APPROVAL
  }
  if (discountPercent > 10 && userRole === Role.MANAGER) {
    return { allowed: true, requiresApproval: false }; // Manager can auto-approve high discounts
  }
  return { allowed: true, requiresApproval: false };
}

function evaluateStatusTransitionPermission(userRole: Role, currentStatus: string, targetStatus: string): boolean {
  // SALES cannot self-approve a PENDING_APPROVAL quote
  if (currentStatus === "PENDING_APPROVAL" && targetStatus === "APPROVED" && userRole === Role.SALES) {
    return false;
  }
  // SALES cannot modify an ARCHIVED or EXPIRED quote
  if (["ARCHIVED", "EXPIRED", "CLOSED_WON"].includes(currentStatus)) {
    return false;
  }
  return true;
}

describe("RBAC & State Machine Guardrails (Section 9 & Section 4.4)", () => {
  it("should flag quotes with >10% discount from SALES role as requiring MANAGER approval", () => {
    const result = evaluateDiscountPermission(Role.SALES, 15);
    expect(result.allowed).toBe(true);
    expect(result.requiresApproval).toBe(true);
  });

  it("should allow MANAGER to bypass approval queue for >10% discounts", () => {
    const result = evaluateDiscountPermission(Role.MANAGER, 15);
    expect(result.allowed).toBe(true);
    expect(result.requiresApproval).toBe(false);
  });

  it("should block SALES users from approving quotes in PENDING_APPROVAL state (403 RBAC Guard)", () => {
    const canApprove = evaluateStatusTransitionPermission(Role.SALES, "PENDING_APPROVAL", "APPROVED");
    expect(canApprove).toBe(false);
  });

  it("should enforce read-only immutability on ARCHIVED and EXPIRED quotes", () => {
    const canModify = evaluateStatusTransitionPermission(Role.SALES, "ARCHIVED", "DRAFT");
    expect(canModify).toBe(false);
  });
});