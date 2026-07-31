"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { calculateQuotePricing } from "@/lib/pricing";
import { generateQuoteNumber } from "@/lib/quoteNumber";
import { QuoteStatus } from "@prisma/client";
import { canCreateQuote, canReviseQuote, requiresManagerApproval } from "@/lib/rbac";
import { auth } from "@/auth";

export interface CreateQuoteItemInput {
  partId: string; // Used to fetch initial snapshot from DB
  quantity: number;
  marginPercent: number;
  discountPercent?: number; // Added for 10% threshold check
  overrideReason?: string;  // Mandatory if discountPercent > 10
}

export interface CreateQuoteInput {
  customerId: string;
  createdById: string; // The authenticated user ID (SALES or MANAGER)
  discountPercent?: number;
  taxRate?: number;
  notes?: string;
  validUntil: string | Date;
  items: CreateQuoteItemInput[];
}

// ==========================================
// AUTO-EXPIRY (CHECK-ON-READ / LAZY EXPIRY)
// ==========================================

export async function expirePastDueQuotes() {
  const now = new Date();
  await db.quote.updateMany({
    where: {
      status: {
        in: [
          QuoteStatus.DRAFT,
          QuoteStatus.PENDING_APPROVAL,
          QuoteStatus.APPROVED,
          QuoteStatus.SENT,
          QuoteStatus.UNDER_NEGOTIATION,
          QuoteStatus.CUSTOMER_REVIEW,
        ],
      },
      validUntil: {
        lt: now, // Expiration date is in the past
      },
    },
    data: {
      status: QuoteStatus.EXPIRED,
    },
  });
}

export async function getQuotes() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("401 Unauthorized");
  }

  // Check-on-Read: Silently mark past-due quotes as EXPIRED before returning list
  await expirePastDueQuotes();

  return await db.quote.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      lineItems: true,
    },
  });
}

// ==========================================
// QUOTE CREATION & REVISIONS
// ==========================================

export async function createQuote(input: CreateQuoteInput) {
  if (!input.items || input.items.length === 0) {
    throw new Error("A quote must contain at least one line item.");
  }

  // 1. RBAC Guardrail: Verify user has permission to create quotes
  const creator = await db.user.findUnique({ where: { id: input.createdById } });
  if (!creator || !canCreateQuote(creator)) {
    throw new Error("403 Forbidden: User is not authorized to create quotations.");
  }

  // 2. Auto-Routing: High discounts (>15%) require managerial approval
  const discountVal = input.discountPercent || 0;
  const initialStatus = requiresManagerApproval(discountVal)
    ? QuoteStatus.PENDING_APPROVAL
    : QuoteStatus.DRAFT;

  // 3. Day 2 Guardrail: 10% Price-Override Threshold + Mandatory Reason
  for (const item of input.items) {
    const itemDiscount = item.discountPercent || 0;
    if (itemDiscount > 10 && (!item.overrideReason || item.overrideReason.trim() === "")) {
      throw new Error(
        `400 Bad Request: Line-item discounts exceeding 10% require a mandatory overrideReason (Part ID: ${item.partId}).`
      );
    }
  }

  // 4. Fetch current part details from the database to FREEZE prices
  const partIds = input.items.map((i) => i.partId);
  const dbParts = await db.part.findMany({
    where: { id: { in: partIds } },
  });

  const partMap = new Map(dbParts.map((p) => [p.id, p]));

  // 5. Build frozen line item snapshots
  const lineItemsData = input.items.map((item) => {
    const part = partMap.get(item.partId);
    if (!part) {
      throw new Error(`Part ID ${item.partId} not found in catalog.`);
    }

    const quantity = Math.max(1, item.quantity);
    const unitCost = Math.max(0, part.unitPrice); // Base cost from catalog
    const marginPercent = Math.max(0, item.marginPercent);
    const itemDiscount = Math.max(0, item.discountPercent || 0);

    // Calculate Selling Price from Cost + Margin
    let unitPrice = unitCost;
    if (marginPercent > 0 && marginPercent < 100) {
      unitPrice = unitCost / (1 - marginPercent / 100);
    } else if (marginPercent >= 100) {
      unitPrice = unitCost * (1 + marginPercent / 100);
    }

    const discountAmount = Number(((unitPrice * itemDiscount) / 100).toFixed(4));
    const finalUnitPrice = Math.max(0, unitPrice - discountAmount);
    const totalPrice = Math.max(0, quantity * finalUnitPrice);

    return {
      partNumber: part.manufacturerPartNum,
      description: part.description,
      quantity: quantity,
      listPrice: Number(unitCost.toFixed(4)),
      unitPrice: Number(finalUnitPrice.toFixed(4)),
      discountPercent: itemDiscount,
      discountAmount: discountAmount,
      totalPrice: Number(totalPrice.toFixed(4)),
      leadTimeDays: 14, // Default lead time
      overrideReason: item.overrideReason || null,
    };
  });

  // 6. Compute Quote-Level Totals (Stored, not computed on read)
  const totals = calculateQuotePricing({
    lineItems: lineItemsData.map((li) => ({
      partNumber: li.partNumber,
      description: li.description,
      quantity: li.quantity,
      listPrice: li.unitPrice,
      unitPrice: li.unitPrice,
    })),
    quoteDiscountPercent: discountVal,
    taxRate: input.taxRate || 18, // Default 18% GST
  });

  // 7. Generate Unique Human-Readable Quote Number
  const quoteNumber = await generateQuoteNumber();

  // 8. Execute DB Transaction
  const createdQuote = await db.quote.create({
    data: {
      quoteNumber: quoteNumber,
      version: 1,
      status: initialStatus,
      subtotal: totals.subtotal,
      discountPercent: totals.quoteDiscountPercent,
      taxRate: totals.taxRate,
      totalAmount: totals.totalAmount,
      notes: input.notes || null,
      validUntil: new Date(input.validUntil),
      customerId: input.customerId,
      createdById: input.createdById,
      lineItems: {
        create: lineItemsData,
      },
    },
    include: {
      lineItems: true,
      customer: true,
    },
  });

  try {
    revalidatePath("/quotes");
  } catch {
    // Silently ignore cache invalidation errors when running via standalone CLI / tests
  }

  return createdQuote;
}

export interface ReviseQuoteInput {
  quoteId: string; // ID of the version being revised (e.g., v1)
  updatedById: string; // Authenticated user ID creating the revision
  items?: CreateQuoteItemInput[]; // Optional updated items; defaults to existing items if omitted
  discountPercent?: number;
  taxRate?: number;
  notes?: string;
  validUntil?: Date | string;
}

export async function reviseQuote(input: ReviseQuoteInput) {
  // 1. Fetch user and target quote to revise with its existing line items
  const user = await db.user.findUnique({ where: { id: input.updatedById } });
  const originalQuote = await db.quote.findUnique({
    where: { id: input.quoteId },
    include: { lineItems: true },
  });

  if (!user) {
    throw new Error("401 Unauthorized: User not found.");
  }
  if (!originalQuote) {
    throw new Error(`Quote with ID "${input.quoteId}" not found.`);
  }

  // 2. ENFORCE SERVER-SIDE RBAC GUARDRAILS
  if (
    !canReviseQuote(user, {
      ...originalQuote,
      discountPercent: originalQuote.discountPercent
        ? Number(originalQuote.discountPercent)
        : undefined,
    })
  ) {
    throw new Error(
      `403 Forbidden: (${user.role}) user cannot revise Quote ${originalQuote.quoteNumber}. Either ownership mismatch or status is immutable.`
    );
  }

  // 3. Prepare line items for the new revision
  let lineItemsData;

  if (input.items && input.items.length > 0) {
    // 3.5 Day 2 Guardrail: 10% Price-Override Threshold + Mandatory Reason for revisions
    for (const item of input.items) {
      const itemDiscount = item.discountPercent || 0;
      if (
        itemDiscount > 10 &&
        (!item.overrideReason || item.overrideReason.trim() === "")
      ) {
        throw new Error(
          `400 Bad Request: Line-item discounts exceeding 10% require a mandatory overrideReason (Part ID: ${item.partId}).`
        );
      }
    }

    const partIds = input.items.map((i) => i.partId);
    const dbParts = await db.part.findMany({
      where: { id: { in: partIds } },
    });
    const partMap = new Map(dbParts.map((p) => [p.id, p]));

    lineItemsData = input.items.map((item) => {
      const part = partMap.get(item.partId);
      if (!part) {
        throw new Error(`Part ID ${item.partId} not found in catalog.`);
      }

      const quantity = Math.max(1, item.quantity);
      const unitCost = Math.max(0, part.unitPrice);
      const marginPercent = Math.max(0, item.marginPercent);
      const itemDiscount = Math.max(0, item.discountPercent || 0);

      let unitPrice = unitCost;
      if (marginPercent > 0 && marginPercent < 100) {
        unitPrice = unitCost / (1 - marginPercent / 100);
      } else if (marginPercent >= 100) {
        unitPrice = unitCost * (1 + marginPercent / 100);
      }

      const discountAmount = Number(((unitPrice * itemDiscount) / 100).toFixed(4));
      const finalUnitPrice = Math.max(0, unitPrice - discountAmount);
      const totalPrice = Math.max(0, quantity * finalUnitPrice);

      return {
        partNumber: part.manufacturerPartNum,
        description: part.description,
        quantity: quantity,
        listPrice: Number(unitCost.toFixed(4)),
        unitPrice: Number(finalUnitPrice.toFixed(4)),
        discountPercent: itemDiscount,
        discountAmount: discountAmount,
        totalPrice: Number(totalPrice.toFixed(4)),
        leadTimeDays: 14,
        overrideReason: item.overrideReason || null,
      };
    });
  } else {
    // Carry over original items but refresh price structures
    lineItemsData = originalQuote.lineItems.map((item) => ({
      partNumber: item.partNumber,
      description: item.description,
      quantity: item.quantity,
      listPrice: item.listPrice,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent,
      discountAmount: item.discountAmount,
      totalPrice: item.totalPrice,
      leadTimeDays: item.leadTimeDays,
      overrideReason: (item as any).overrideReason || null,
    }));
  }

  // 4. Compute new stored totals
  const discountPercent =
    input.discountPercent !== undefined
      ? input.discountPercent
      : Number(originalQuote.discountPercent);

  const taxRate =
    input.taxRate !== undefined
      ? input.taxRate
      : Number(originalQuote.taxRate);

  const totals = calculateQuotePricing({
    lineItems: lineItemsData.map((li) => ({
      partNumber: li.partNumber,
      description: li.description,
      quantity: li.quantity,
      listPrice: Number(li.unitPrice),
      unitPrice: Number(li.unitPrice),
    })),
    quoteDiscountPercent: discountPercent,
    taxRate,
  });

  // 5. Atomic Transaction: Mark previous version as ARCHIVED & create v(N+1)
  const newVersionNumber = originalQuote.version + 1;

  const [archivedQuote, revisedQuote] = await db.$transaction([
    // Step A: Archive original quote version
    db.quote.update({
      where: { id: originalQuote.id },
      data: { status: QuoteStatus.ARCHIVED },
    }),

    // Step B: Insert new version record with identical quoteNumber
    db.quote.create({
      data: {
        quoteNumber: originalQuote.quoteNumber,
        version: newVersionNumber,
        status: QuoteStatus.DRAFT,
        subtotal: totals.subtotal,
        discountPercent: totals.quoteDiscountPercent,
        taxRate: totals.taxRate,
        totalAmount: totals.totalAmount,
        notes: input.notes !== undefined ? input.notes : originalQuote.notes,
        validUntil: input.validUntil
          ? new Date(input.validUntil)
          : originalQuote.validUntil,
        customerId: originalQuote.customerId,
        createdById: input.updatedById,
        lineItems: {
          create: lineItemsData,
        },
      },
      include: {
        lineItems: true,
        customer: true,
      },
    }),
  ]);

  try {
    revalidatePath("/quotes");
  } catch {
    // Graceful fallback during standalone script execution
  }

  return {
    previousQuote: archivedQuote,
    newQuote: revisedQuote,
  };
}

// ==========================================
// STATE TRANSITION ENGINE & RBAC ACTION
// ==========================================

const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT: [QuoteStatus.PENDING_APPROVAL, QuoteStatus.SENT],
  PENDING_APPROVAL: [QuoteStatus.APPROVED, QuoteStatus.REJECTED],
  APPROVED: [QuoteStatus.SENT],
  REJECTED: [QuoteStatus.DRAFT],
  SENT: [
    QuoteStatus.UNDER_NEGOTIATION,
    QuoteStatus.CLOSED_WON,
    QuoteStatus.CLOSED_LOST,
    QuoteStatus.EXPIRED,
  ],
  UNDER_NEGOTIATION: [
    QuoteStatus.ACCEPTED,
    QuoteStatus.ORDER_PLACED,
    QuoteStatus.CLOSED_LOST,
    QuoteStatus.EXPIRED,
  ],
  ACCEPTED: [QuoteStatus.ORDER_PLACED, QuoteStatus.CLOSED_WON, QuoteStatus.CLOSED_LOST],
  ORDER_PLACED: [QuoteStatus.CLOSED_WON],
  CLOSED_WON: [],
  CLOSED_LOST: [QuoteStatus.DRAFT],
  EXPIRED: [QuoteStatus.DRAFT],
  ARCHIVED: [],
  CUSTOMER_REVIEW: [QuoteStatus.ACCEPTED, QuoteStatus.REJECTED, QuoteStatus.EXPIRED],
};

function canUserTransition(
  currentStatus: QuoteStatus,
  targetStatus: QuoteStatus,
  userRole: string
): boolean {
  const allowedNextStates = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowedNextStates.includes(targetStatus)) return false;

  // RBAC Enforcement: Only ADMIN or MANAGER can Approve/Reject discounts
  if (
    currentStatus === QuoteStatus.PENDING_APPROVAL &&
    (targetStatus === QuoteStatus.APPROVED || targetStatus === QuoteStatus.REJECTED)
  ) {
    return userRole === "ADMIN" || userRole === "MANAGER";
  }

  return ["ADMIN", "MANAGER", "SALES_REP"].includes(userRole);
}

export async function updateQuoteStatus(quoteId: string, targetStatus: QuoteStatus) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const userRole = (session.user as any).role || "SALES_REP";

  // 1. Fetch current quote
  const quote = await db.quote.findUnique({
    where: { id: quoteId },
    select: { status: true },
  });

  if (!quote) {
    return { error: "Quote not found" };
  }

  const currentStatus = quote.status as QuoteStatus;

  // 2. Validate against State Machine & RBAC
  if (!canUserTransition(currentStatus, targetStatus, userRole)) {
    return {
      error: `Permission denied: Cannot transition from ${currentStatus} to ${targetStatus} as ${userRole}`,
    };
  }

  // 3. Perform database update
  try {
    await db.quote.update({
      where: { id: quoteId },
      data: { status: targetStatus },
    });

    try {
      revalidatePath(`/quotes`);
      revalidatePath(`/quotes/${quoteId}`);
    } catch {
      // Ignore in standalone tests
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to update status:", error);
    return { error: "Database update failed" };
  }
}