// src/app/quotes/[id]/page.tsx
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import QuoteStatusActions from "@/components/quotes/QuoteStatusActions";
import RevisionDiffWrapper from "@/components/quotes/RevisionDiffWrapper";

export default async function QuoteDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  // 1. Resolve params (Next.js 16 App Router standard)
  const { id } = await params;

  // 2. Fetch User Session for RBAC
  const session = await auth();
  const userRole = (session?.user as any)?.role || "SALES";

  // 3. Fetch Quote Data with Customer and Line Items
  const quote = await db.quote.findUnique({
    where: { id },
    include: { customer: true, lineItems: true },
  });

  if (!quote) notFound();

  // 4. Fetch all versions of this quoteNumber so we can feed them to the Diff Modal!
  const allRevisions = await db.quote.findMany({
    where: { quoteNumber: quote.quoteNumber },
    orderBy: { version: "asc" },
    include: { lineItems: true },
  });

  return (
    <div className="flex flex-col gap-8 p-6 text-gray-100">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{quote.quoteNumber}</h1>
            <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-300">
              v{quote.version}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Customer: <span className="text-gray-200 font-medium">{quote.customer.companyName}</span>
          </p>
        </div>

        {/* Action Controls: Diff Modal + State Machine Actions */}
        <div className="flex items-center gap-3">
          {allRevisions.length > 1 && (
            <RevisionDiffWrapper
              quoteNumber={quote.quoteNumber}
              revisions={allRevisions}
              currentVersion={quote.version}
            />
          )}

          <QuoteStatusActions
            quoteId={quote.id}
            currentStatus={quote.status}
            userRole={userRole}
          />
        </div>
      </div>

      {/* Line Items Table Section */}
      <div className="rounded-lg border border-gray-800 bg-gray-950 p-6">
        <h2 className="text-lg font-semibold mb-4">Line Items & Bill of Materials</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="pb-3 font-medium">Part Number</th>
                <th className="pb-3 font-medium">Description</th>
                <th className="pb-3 font-medium text-right">Lead Time</th>
                <th className="pb-3 font-medium text-right">Qty</th>
                <th className="pb-3 font-medium text-right">List Price</th>
                <th className="pb-3 font-medium text-right">Discount</th>
                <th className="pb-3 font-medium text-right">Total Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {quote.lineItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-900/40">
                  <td className="py-4 font-mono text-blue-400">{item.partNumber}</td>
                  <td className="py-4 text-gray-300">
                    <div>{item.description}</div>
                    {item.overrideReason && (
                      <span className="inline-block mt-1 text-xs text-amber-400/90 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded">
                        ⚠️ Reason: {item.overrideReason}
                      </span>
                    )}
                  </td>
                  <td className="py-4 text-right text-gray-400">{item.leadTimeDays} days</td>
                  <td className="py-4 text-right font-medium">{item.quantity}</td>
                  <td className="py-4 text-right text-gray-400">
                    ${Number(item.listPrice).toFixed(2)}
                  </td>
                  <td className="py-4 text-right text-amber-400">
                    {Number(item.discountPercent)}%
                  </td>
                  <td className="py-4 text-right font-semibold text-gray-200">
                    ${Number(item.totalPrice).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary Breakdown */}
        <div className="mt-6 flex justify-end border-t border-gray-800 pt-6">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal:</span>
              <span>${Number(quote.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Overall Discount:</span>
              <span>{Number(quote.discountPercent)}%</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Est. Tax Rate:</span>
              <span>{Number(quote.taxRate)}%</span>
            </div>
            <div className="flex justify-between border-t border-gray-800 pt-2 text-base font-bold text-gray-100">
              <span>Total Value:</span>
              <span className="text-green-400">${Number(quote.totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}