"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { calculateQuotePricing } from "@/lib/pricing";
import { generateQuoteNumber } from "@/lib/quoteNumber";
import { QuoteStatus } from "@prisma/client";
import { canCreateQuote, canReviseQuote, requiresManagerApproval } from "@/lib/rbac";

export interface CreateQuoteItemInput {
  partId: string; // Used to fetch initial snapshot from DB
  quantity: number;
  marginPercent: number;
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

  // 3. Fetch current part details from the database to FREEZE prices
  const partIds = input.items.map((i) => i.partId);
  const dbParts = await db.part.findMany({
    where: { id: { in: partIds } },
  });

  const partMap = new Map(dbParts.map((p) => [p.id, p]));

  // 4. Build frozen line item snapshots
  const lineItemsData = input.items.map((item) => {
    const part = partMap.get(item.partId);
    if (!part) {
      throw new Error(`Part ID ${item.partId} not found in catalog.`);
    }

    const quantity = Math.max(1, item.quantity);
    const unitCost = Math.max(0, part.unitPrice); // Base cost from catalog
    const marginPercent = Math.max(0, item.marginPercent);

    // Calculate Selling Price from Cost + Margin
    let unitPrice = unitCost;
    if (marginPercent > 0 && marginPercent < 100) {
      unitPrice = unitCost / (1 - marginPercent / 100);
    } else if (marginPercent >= 100) {
      unitPrice = unitCost * (1 + marginPercent / 100);
    }

    const totalPrice = Math.max(0, quantity * unitPrice);

    return {
      partNumber: part.manufacturerPartNum,
      description: part.description,
      quantity: quantity,
      listPrice: Number(unitCost.toFixed(4)),
      unitPrice: Number(unitPrice.toFixed(4)),
      discountPercent: 0,
      discountAmount: 0,
      totalPrice: Number(totalPrice.toFixed(4)),
      leadTimeDays: 14, // Default lead time
    };
  });

  // 5. Compute Quote-Level Totals (Stored, not computed on read)
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

  // 6. Generate Unique Human-Readable Quote Number
  const quoteNumber = await generateQuoteNumber();

  // 7. Execute DB Transaction
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
  if (!canReviseQuote(user, {
    ...originalQuote,
    discountPercent: originalQuote.discountPercent ? Number(originalQuote.discountPercent) : undefined,
  })) {
    throw new Error(
      `403 Forbidden: (${user.role}) user cannot revise Quote ${originalQuote.quoteNumber}. Either ownership mismatch or status is immutable.`
    );
  }

  // 3. Prepare line items for the new revision
  let lineItemsData;

  if (input.items && input.items.length > 0) {
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

      let unitPrice = unitCost;
      if (marginPercent > 0 && marginPercent < 100) {
        unitPrice = unitCost / (1 - marginPercent / 100);
      } else if (marginPercent >= 100) {
        unitPrice = unitCost * (1 + marginPercent / 100);
      }

      const totalPrice = Math.max(0, quantity * unitPrice);

      return {
        partNumber: part.manufacturerPartNum,
        description: part.description,
        quantity: quantity,
        listPrice: Number(unitCost.toFixed(4)),
        unitPrice: Number(unitPrice.toFixed(4)),
        discountPercent: 0,
        discountAmount: 0,
        totalPrice: Number(totalPrice.toFixed(4)),
        leadTimeDays: 14,
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