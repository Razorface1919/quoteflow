// src/app/page.tsx
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import PipelineChart from "@/components/quotes/PipelineChart"; 

export const dynamic = "force-dynamic";

export default async function AnalyticsDashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const totalQuotes = await db.quote.count();
  const quotesByStatus = await db.quote.groupBy({
    by: ["status"],
    _count: { status: true },
    _sum: { totalAmount: true },
  });

  const expiringCount = await db.quote.count({
    where: {
      status: { in: ["SENT", "APPROVED"] },
    },
  });

  const formattedPipelineData = quotesByStatus.map((item) => ({
    status: item.status,
    count: item._count.status,
    totalValue: Number(item._sum.totalAmount || 0),
  }));

  return (
    <div className="min-h-screen bg-zinc-50 py-10 px-4 sm:px-6 lg:px-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Pipeline Overview
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Track your open quotes, recent wins, and overall pipeline health.
            </p>
          </div>

          <Link
            href="/quotes/new"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
          >
            + Create New Quote
          </Link>
        </div>

        {/* 4-Column Executive Metrics Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#121212]">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Quotes</p>
            <p className="mt-2 text-3xl font-extrabold text-zinc-900 dark:text-white">{totalQuotes}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#121212]">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">90-Day Win Rate</p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">68.4%</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#121212]">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Active Quotes</p>
            <p className="mt-2 text-3xl font-extrabold text-amber-600 dark:text-amber-400">{expiringCount}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#121212]">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Discount Overrides</p>
            <p className="mt-2 text-3xl font-extrabold text-blue-600 dark:text-blue-400">3</p>
          </div>
        </div>

        {/* Visual Pipeline Breakdown */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#121212]">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Quotes by Status
            </h2>
            <Link href="/quotes" className="text-xs font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 transition-colors">
              View All Quotes &rarr;
            </Link>
          </div>
          
          <PipelineChart data={formattedPipelineData} />
          
        </div>
      </div>
    </div>
  );
}