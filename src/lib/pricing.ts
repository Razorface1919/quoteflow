export interface LineItemInput {
  partNumber: string;
  description: string;
  quantity: number;
  listPrice: number;       // Catalog price
  unitPrice?: number;      // Selling price (defaults to listPrice if omitted)
  overrideReason?: string; // Mandatory if (listPrice - unitPrice)/listPrice > 0.10
  discountPercent?: number; // e.g., 5 for 5%
  discountAmount?: number;  // Absolute reduction per line total
  leadTimeDays?: number;
}

export interface QuotePricingInput {
  lineItems: LineItemInput[];
  quoteDiscountPercent?: number; // e.g., 10 for 10% global discount
  taxRate?: number;              // e.g., 18 for 18% GST
  overrideThresholdPercent?: number; // Defaults to 10% (0.10)
}

export interface CalculatedLineItem extends LineItemInput {
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  totalPrice: number;
}

export interface QuotePricingResult {
  lineItems: CalculatedLineItem[];
  subtotal: number;
  quoteDiscountPercent: number;
  quoteDiscountAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
}

/**
 * Rounds a number to a specified number of decimal places to prevent float drift.
 */
function round(value: number, decimals = 4): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Calculates line-item totals and quote-level financial summaries
 * using a List-Price + Discount model with Zero-Clamping.
 */
export function calculateQuotePricing(input: QuotePricingInput): QuotePricingResult {
  const threshold = input.overrideThresholdPercent ?? 10; // 10% threshold by default
  const quoteDiscountPct = Math.max(0, input.quoteDiscountPercent ?? 0);
  const taxRate = Math.max(0, input.taxRate ?? 0);

  const calculatedLines: CalculatedLineItem[] = input.lineItems.map((item) => {
    const quantity = Math.max(1, item.quantity);
    const listPrice = Math.max(0, item.listPrice);
    
    // If unitPrice isn't explicitly overridden, default to listPrice
    const unitPrice = Math.max(0, item.unitPrice ?? listPrice);
    
    // 1. Audit Guardrail: Enforce mandatory reason if unitPrice is overridden below threshold
    if (listPrice > 0) {
      const priceDropPercent = ((listPrice - unitPrice) / listPrice) * 100;
      if (priceDropPercent > threshold && (!item.overrideReason || item.overrideReason.trim() === "")) {
        throw new Error(
          `Price override for part ${item.partNumber} exceeds ${threshold}% threshold. An overrideReason is required.`
        );
      }
    }

    const discountPercent = Math.max(0, item.discountPercent ?? 0);
    const discountAmount = Math.max(0, item.discountAmount ?? 0);

    // 2. Line Total Math: (unitPrice * quantity) minus percentage discount minus absolute discount
    const baseLineTotal = unitPrice * quantity;
    const percentageDiscountValue = baseLineTotal * (discountPercent / 100);
    
    // Zero-clamp line item totals so heavy discounts can't make a line item negative
    const totalPrice = Math.max(0, baseLineTotal - percentageDiscountValue - discountAmount);

    return {
      ...item,
      quantity,
      listPrice: round(listPrice),
      unitPrice: round(unitPrice),
      discountPercent: round(discountPercent, 2),
      discountAmount: round(discountAmount),
      totalPrice: round(totalPrice),
    };
  });

  // 3. Aggregate Quote Subtotal
  const subtotal = calculatedLines.reduce((sum, item) => sum + item.totalPrice, 0);

  // 4. Global Quote Discount & Tax Math (Zero-Clamped)
  const quoteDiscountAmount = Math.max(0, subtotal * (quoteDiscountPct / 100));
  const discountedSubtotal = Math.max(0, subtotal - quoteDiscountAmount);
  const taxAmount = Math.max(0, discountedSubtotal * (taxRate / 100));
  const totalAmount = Math.max(0, discountedSubtotal + taxAmount);

  return {
    lineItems: calculatedLines,
    subtotal: round(subtotal, 2),
    quoteDiscountPercent: round(quoteDiscountPct, 2),
    quoteDiscountAmount: round(quoteDiscountAmount, 2),
    taxRate: round(taxRate, 2),
    taxAmount: round(taxAmount, 2),
    totalAmount: round(totalAmount, 2),
  };
}