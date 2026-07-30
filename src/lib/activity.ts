import { Prisma, PrismaClient } from "@prisma/client";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export interface LogActivityInput {
  quoteId: string;
  userId: string;
  action:
    | "QUOTE_CREATED"
    | "STATUS_CHANGE"
    | "REVISION_CREATED"
    | "PRICE_OVERRIDE"
    | "LINE_ITEM_DISCOUNT";
  notes?: string;
}

/**
 * Records an immutable audit log entry for a quote.
 * Can be passed a Prisma Transaction Client (tx) to execute atomically inside operations.
 */
export async function logQuoteActivity(
  tx: TransactionClient,
  input: LogActivityInput
): Promise<void> {
  await tx.activityLog.create({
    data: {
      quoteId: input.quoteId,
      userId: input.userId,
      action: input.action,
      notes: input.notes ?? null,
    },
  });
}