import React from "react";
import { getAnalyticsData } from "@/app/actions/analytics";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import PipelineChart from "./PipelineChart"; // <-- Import the new client component

export const dynamic = "force-dynamic";

export default async function AnalyticsDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const data = await getAnalyticsData();

  return (
    <div className="min-h-screen bg-zinc-50 py-10 px-4 sm:px-6 lg:px-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Executive Analytics Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Section 4.5 Metrics — Pipeline valuation, expiration risk, and conversion velocity.
          </p>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs font-semibold uppercase text-zinc-500">
              90-Day Win Rate
            </div>
            <div className="mt-2 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {data.winRate}%
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Based on {data.totalClosed90Days} closed quotes
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs font-semibold uppercase text-zinc-500">
              Expiring in 7 Days
            </div>
            <div className="mt-2 text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {data.expiringSoon.length}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Quotes at immediate expiration risk
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs font-semibold uppercase text-zinc-500">
              Top Customer Open Value
            </div>
            <div className="mt-2 text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
              ${(data.topCustomers[0]?.openValue || 0).toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              {data.topCustomers[0]?.companyName || "No open pipeline"}
            </div>
          </div>
        </div>

        {/* Status Breakdown (Updated with Visual Chart) */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Pipeline Breakdown by Lifecycle Status
            </h2>
            <a href="/quotes" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
              View All Quotes &rarr;
            </a>
          </div>
          <PipelineChart data={data.statusGroups} />
        </div>

        {/* Two-Column Section: Expiration Risk & Top Customers */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          
          {/* Top 5 Customers */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-4">
              Top 5 Customers by Open Pipeline
            </h2>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
              {data.topCustomers.map((cust, i) => (
                <div key={i} className="py-3 flex justify-between items-center">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {i + 1}. {cust.companyName}
                  </span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    ${cust.openValue.toLocaleString()}
                  </span>
                </div>
              ))}
              {data.topCustomers.length === 0 && (
                <p className="py-4 text-center text-zinc-500">No active open pipeline.</p>
              )}
            </div>
          </div>

          {/* 7-Day Expiration Warning Table */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-4">
              ⚠️ Quotes Expiring Within 7 Days
            </h2>
            {data.expiringSoon.length === 0 ? (
              <p className="text-sm text-zinc-500">No quotes expiring in the next 7 days.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <tr>
                      <th className="py-2.5 px-4">Quote #</th>
                      <th className="py-2.5 px-4">Customer</th>
                      <th className="py-2.5 px-4 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {data.expiringSoon.map((quote) => (
                      <tr key={quote.id}>
                        <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                          {quote.quoteNumber}
                        </td>
                        <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300">
                          {quote.customer.companyName}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                          ${quote.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}