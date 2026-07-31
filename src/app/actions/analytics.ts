"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function getAnalyticsData() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(now.getDate() + 7);

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(now.getDate() - 90);

  // 1. Value & Count by Status
  const statusGroups = await db.quote.groupBy({
    by: ["status"],
    _count: { id: true },
    _sum: { totalAmount: true },
  });

  // 2. Quotes Expiring in the Next 7 Days (Open statuses only)
  const expiringSoon = await db.quote.findMany({
    where: {
      status: { in: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT"] },
      validUntil: {
        gte: now,
        lte: sevenDaysFromNow,
      },
    },
    select: {
      id: true,
      quoteNumber: true,
      totalAmount: true,
      validUntil: true,
      customer: { select: { companyName: true } },
    },
    orderBy: { validUntil: "asc" },
  });

  // 3. Top 5 Customers by Open Quote Value
  const openQuotesByCustomer = await db.quote.groupBy({
    by: ["customerId"],
    where: {
      status: { in: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT"] },
    },
    _sum: { totalAmount: true },
    orderBy: {
      _sum: {
        totalAmount: "desc",
      },
    },
    take: 5,
  });

  // Resolve customer names for the top 5
  const customerIds = openQuotesByCustomer
    .map((c) => c.customerId)
    .filter((id): id is string => Boolean(id));

  const customers = await db.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, companyName: true },
  });

  const topCustomers = openQuotesByCustomer.map((item) => {
    const cust = customers.find((c) => c.id === item.customerId);
    return {
      companyName: cust?.companyName || "Unknown Customer",
      openValue: Number(item._sum.totalAmount || 0),
    };
  });

  // 4. 90-Day Win Rate Percentage
  const closedIn90Days = await db.quote.groupBy({
    by: ["status"],
    where: {
      status: { in: ["CLOSED_WON", "CLOSED_LOST"] },
      updatedAt: { gte: ninetyDaysAgo },
    },
    _count: { id: true },
  });

  const wonCount =
    closedIn90Days.find((g) => g.status === "CLOSED_WON")?._count.id || 0;
  const lostCount =
    closedIn90Days.find((g) => g.status === "CLOSED_LOST")?._count.id || 0;
  const totalClosed = wonCount + lostCount;
  const winRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0;

  return {
    statusGroups: statusGroups.map((g) => ({
      status: g.status,
      count: g._count.id,
      totalValue: Number(g._sum.totalAmount || 0),
    })),
    expiringSoon: expiringSoon.map((q) => ({
      ...q,
      totalAmount: Number(q.totalAmount),
    })),
    topCustomers,
    winRate,
    totalClosed90Days: totalClosed,
  };
}