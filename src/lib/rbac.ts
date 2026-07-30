import { Role, QuoteStatus } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  role: Role;
}

export interface QuoteTarget {
  createdById: string;
  status: QuoteStatus;
  discountPercent?: number | string;
}

/**
 * Validates if a user has permission to CREATE a quotation.
 * All authenticated users (ADMIN, MANAGER, SALES) can create quotes.
 */
export function canCreateQuote(user: AuthenticatedUser): boolean {
  return [Role.ADMIN, Role.MANAGER, Role.SALES].includes(user.role);
}

/**
 * Validates if a user has permission to REVISE/EDIT a quotation.
 * - ADMIN & MANAGER: Can revise any quote in DRAFT or REJECTED status.
 * - SALES: Can ONLY revise quotes created by themselves that are DRAFT or REJECTED.
 * - No user can revise an ARCHIVED, SENT, or ACCEPTED quote directly.
 */
export function canReviseQuote(user: AuthenticatedUser, quote: QuoteTarget): boolean {
  // 1. Immutable statuses cannot be revised by anyone
  const immutableStatuses: QuoteStatus[] = [
    QuoteStatus.ARCHIVED,
    QuoteStatus.SENT,
    QuoteStatus.ACCEPTED,
  ];
  if (immutableStatuses.includes(quote.status)) {
    return false;
  }

  // 2. Admin & Manager team-wide override
  if (user.role === Role.ADMIN || user.role === Role.MANAGER) {
    return true;
  }

  // 3. Sales rep ownership restriction
  if (user.role === Role.SALES) {
    return quote.createdById === user.id;
  }

  return false;
}

/**
 * Validates if a quote requires managerial approval based on high discounts (> 15%).
 */
export function requiresManagerApproval(discountPercent: number): boolean {
  return discountPercent > 15.0;
}

/**
 * Validates if a user has permission to APPROVE a quote pending managerial review.
 * Only ADMIN and MANAGER roles can approve quotes.
 */
export function canApproveQuote(user: AuthenticatedUser): boolean {
  return user.role === Role.ADMIN || user.role === Role.MANAGER;
}