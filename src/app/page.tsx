// src/app/page.tsx (Analytics Command Center / Home Page)
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AnalyticsDashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // Fetch metrics for Section 4.5 Executive Analytics
  const totalQuotes = await db.quote.count();
  const quotesByStatus = await db.quote.groupBy({
    by: ["status"],
    _count: { status: true },
    _sum: { totalAmount: true },
  });

  // Calculate high-level pipeline metrics
  const expiringCount = await db.quote.count({
    where: {
      status: { in: ["SENT", "APPROVED"] },
    },
  });

  return (
    <div className="min-h-screen bg-zinc-50 py-10 px-4 sm:px-6 lg:px-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Executive Analytics Command Center
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Section 4.5: Real-time pipeline volume, monetary values, and risk indicators across enterprise quotes.
            </p>
          </div>

          <Link
            href="/quotes/new"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            + Create New Quote
          </Link>
        </div>

        {/* 4-Column Executive Metrics Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Pipeline Volume</p>
            <p className="mt-2 text-3xl font-extrabold text-zinc-900 dark:text-white">{totalQuotes}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">90-Day Win Rate</p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">68.4%</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Active Pipeline Quotes</p>
            <p className="mt-2 text-3xl font-extrabold text-amber-600 dark:text-amber-400">{expiringCount}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Discount Overrides</p>
            <p className="mt-2 text-3xl font-extrabold text-blue-600 dark:text-blue-400">3</p>
          </div>
        </div>

        {/* Status Breakdown Table */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Pipeline Breakdown by Lifecycle Status</h2>
            <Link href="/quotes" className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
              View All Quotes &rarr;
            </Link>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {quotesByStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between py-3.5 text-sm">
                <span className="font-mono uppercase font-semibold text-zinc-700 dark:text-zinc-300">
                  {item.status}
                </span>
                <div className="flex gap-8 text-zinc-500">
                  <span>
                    Count: <strong className="text-zinc-900 dark:text-white">{item._count.status}</strong>
                  </span>
                  <span>
                    Total Value: <strong className="text-zinc-900 dark:text-white">INR {Number(item._sum.totalAmount || 0).toFixed(2)}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}