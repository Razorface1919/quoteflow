import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import CreateQuoteForm from "@/components/quotes/CreateQuoteForm";

export const dynamic = "force-dynamic";

export default async function NewQuotePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // 1. Fetch Customers and Active Parts from Database
  const [customers, parts] = await Promise.all([
    db.customer.findMany({
      orderBy: { companyName: "asc" },
      select: { id: true, companyName: true, preferredCurrency: true },
    }),
    db.part.findMany({
      where: { stockQuantity: { gt: 0 } },
      orderBy: { manufacturerPartNum: "asc" },
      take: 200, // Limit dropdown payload size for fast rendering
      select: {
        id: true,
        manufacturer: true,
        manufacturerPartNum: true,
        description: true,
        unitPrice: true,
        stockQuantity: true,
      },
    }),
  ]);

  return (
    <div className="min-h-screen bg-zinc-50 py-10 px-4 sm:px-6 lg:px-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Create New Quotation
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Add catalog parts, apply line-item pricing, and submit for customer delivery or manager approval.
          </p>
        </div>

        <CreateQuoteForm
          customers={customers}
          parts={parts}
          userId={session.user.id!}
        />
      </div>
    </div>
  );
}