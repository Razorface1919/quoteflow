// src/app/quotes/page.tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import QuoteStatusActions from "@/components/quotes/QuoteStatusActions";

export const dynamic = "force-dynamic";

export default async function QuotesListPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // Fetch all quotes, newest first, with customer details and line item counts
  const quotes = await db.quote.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { companyName: true, preferredCurrency: true } },
      _count: { select: { lineItems: true } },
    },
  });

  const userRole = (session.user.role as "ADMIN" | "MANAGER" | "SALES") || "SALES";

  return (
    <div className="min-h-screen bg-zinc-50 py-10 px-4 sm:px-6 lg:px-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Quotations Dashboard
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Manage internal quotations, track version history, and generate PDF documents.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/quotes/new"
              className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white shadow hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
            >
              + Create New Quote
            </Link>
          </div>
        </div>

        {/* Quotes Table */}
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {quotes.length === 0 ? (
            <div className="p-12 text-center text-sm text-zinc-500">
              No quotations found. Click "Create New Quote" to build your first one!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <tr>
                    <th className="py-3.5 px-4">Quote Number</th>
                    <th className="py-3.5 px-4">Version</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Line Items</th>
                    <th className="py-3.5 px-4">Grand Total</th>
                    <th className="py-3.5 px-4">Lifecycle Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {quotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                      {/* 1. Clickable Quote Number Link */}
                      <td className="py-4 px-4 font-semibold text-blue-500 hover:text-blue-400 hover:underline">
                        <Link href={`/quotes/${quote.id}`}>
                          {quote.quoteNumber}
                        </Link>
                      </td>
                      <td className="py-4 px-4 text-zinc-600 dark:text-zinc-400">
                        v{quote.version}
                      </td>
                      <td className="py-4 px-4 font-medium text-zinc-800 dark:text-zinc-200">
                        {quote.customer.companyName}
                      </td>
                      <td className="py-4 px-4 text-zinc-600 dark:text-zinc-400">
                        {quote._count.lineItems} items
                      </td>
                      <td className="py-4 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                        INR {Number(quote.totalAmount).toFixed(2)}
                      </td>
                      <td className="py-4 px-4">
                        <QuoteStatusActions
                          quoteId={quote.id}
                          currentStatus={quote.status}
                          userRole={userRole}
                        />
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* 2. Added explicit View Details button */}
                          <Link
                            href={`/quotes/${quote.id}`}
                            className="inline-flex items-center rounded border border-zinc-300 px-2.5 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                          >
                            👁️ View
                          </Link>
                          <a
                            href={`/api/quotes/${quote.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded border border-zinc-300 px-2.5 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                          >
                            📄 Download PDF
                          </a>
                        </div>
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
  );
}