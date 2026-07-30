import { db } from "@/lib/db";

export async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `QF-${year}-`;

  // Find the latest quote number for the current year
  const lastQuote = await db.quote.findFirst({
    where: {
      quoteNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      quoteNumber: "desc",
    },
  });

  if (!lastQuote) {
    return `${prefix}0001`;
  }

  const lastSequence = parseInt(lastQuote.quoteNumber.replace(prefix, ""), 10);
  const nextSequence = isNaN(lastSequence) ? 1 : lastSequence + 1;

  return `${prefix}${String(nextSequence).padStart(4, "0")}`;
}