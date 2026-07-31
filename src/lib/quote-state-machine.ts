export type QuoteStatus = 
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SENT"
  | "CLOSED_WON"
  | "CLOSED_LOST"
  | "EXPIRED";

// 1. Define which statuses a quote can transition to from its current state
export const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT: ["PENDING_APPROVAL", "SENT"], // If no custom discount, can go straight to SENT
  PENDING_APPROVAL: ["APPROVED", "REJECTED"],
  APPROVED: ["SENT"],
  REJECTED: ["DRAFT"], // Back to drawing board
  SENT: ["CLOSED_WON", "CLOSED_LOST", "EXPIRED"],
  CLOSED_WON: [],
  CLOSED_LOST: ["DRAFT"], // Can reopen as a new draft
  EXPIRED: ["DRAFT"],
};

// 2. Define which Roles are allowed to perform specific transitions
export function canUserTransition(
  currentStatus: QuoteStatus,
  targetStatus: QuoteStatus,
  userRole: string
): boolean {
  // Check if transition is legally possible
  const allowedNextStates = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowedNextStates.includes(targetStatus)) return false;

  // RBAC Enforcement: Only ADMIN or MANAGER can Approve/Reject discounts
  if (
    currentStatus === "PENDING_APPROVAL" &&
    (targetStatus === "APPROVED" || targetStatus === "REJECTED")
  ) {
    return userRole === "ADMIN" || userRole === "MANAGER";
  }

  // All other valid transitions can be performed by SALES_REP, MANAGER, or ADMIN
  return ["ADMIN", "MANAGER", "SALES_REP"].includes(userRole);
}