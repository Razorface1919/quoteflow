import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PrintQuotePage({
  params,
}: {
  params: Promise<{ id: string }>; // <-- Next.js 15+ requires params to be a Promise
}) {
  // Await params first so 'id' is defined!
  const { id } = await params;

  const quote = await db.quote.findUnique({
    where: { id: id },
    include: {
      customer: true,
      lineItems: true,
    },
  });

  if (!quote) notFound();

  // Lookup manufacturer names for all part numbers
  const partNumbers = quote.lineItems.map((item) => item.partNumber);
  const parts = await db.part.findMany({
    where: { manufacturerPartNum: { in: partNumbers } },
  });

  const partMap = new Map(
    parts.map((part) => [part.manufacturerPartNum, part.manufacturer])
  );

  return (
    <div className="min-h-screen bg-white text-black p-12 font-sans">
      <div className="max-w-4xl mx-auto border border-zinc-200 p-8 shadow-sm">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-zinc-200 pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">QUOTEFLOW</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Enterprise Electronics Distributor
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-zinc-800">
              {quote.quoteNumber}
            </h2>
            <p className="text-sm text-zinc-500">Version: v{quote.version}</p>
            <p className="text-sm text-zinc-500">
              Date: {new Date(quote.createdAt).toLocaleDateString("en-IN")}
            </p>
          </div>
        </div>

        {/* Customer & Quote Meta */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Prepared For:
            </h3>
            <p className="font-bold text-lg">{quote.customer.companyName}</p>
            <p className="text-sm text-zinc-600">
              Preferred Currency: {quote.customer.preferredCurrency}
            </p>
          </div>
          <div className="text-right">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Valid Until:
            </h3>
            <p className="font-medium text-zinc-800">
              {quote.validUntil
                ? new Date(quote.validUntil).toLocaleDateString("en-IN")
                : "30 Days from issuance"}
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <table className="w-full text-left border-collapse mb-8">
          <thead>
            <tr className="border-b-2 border-zinc-900 text-xs font-bold uppercase tracking-wider text-zinc-600">
              <th className="py-3">Part Number</th>
              <th className="py-3">Manufacturer</th>
              <th className="py-3 text-right">Qty</th>
              <th className="py-3 text-right">Unit Price (INR)</th>
              <th className="py-3 text-right">Total (INR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 text-sm">
            {quote.lineItems.map((item) => (
              <tr key={item.id}>
                <td className="py-3 font-semibold">
                  {item.partNumber}
                </td>
                <td className="py-3 text-zinc-600">
                  {partMap.get(item.partNumber) || "-"}
                </td>
                <td className="py-3 text-right">{item.quantity}</td>
                <td className="py-3 text-right">
                  {Number(item.unitPrice).toFixed(2)}
                </td>
                <td className="py-3 text-right font-medium">
                  {Number(item.totalPrice).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Financial Summary */}
        <div className="flex justify-end border-t border-zinc-200 pt-6">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal:</span>
              <span>
                INR{" "}
                {(
                  Number(quote.totalAmount) -
                  Number(quote.totalAmount) * (18 / 118)
                ).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>GST (18% approx):</span>
              <span>
                INR {(Number(quote.totalAmount) * (18 / 118)).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between border-t border-zinc-300 pt-2 text-base font-bold text-black">
              <span>Grand Total:</span>
              <span>INR {Number(quote.totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 border-t border-zinc-100 pt-4 text-center text-xs text-zinc-400">
          Generated automatically by QuoteFlow ERP • Confidential Business
          Document
        </div>
      </div>
    </div>
  );
}