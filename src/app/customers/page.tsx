import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import CustomerFormModal from "@/components/customers/CustomerFormModal";
import DeleteCustomerButton from "@/components/customers/DeleteCustomerButton";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const customers = await db.customer.findMany({
    orderBy: { companyName: "asc" },
    include: {
      contacts: true,
      _count: { select: { quotes: true } },
    },
  });

  return (
    <div className="min-h-screen bg-zinc-50 py-10 px-4 sm:px-6 lg:px-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Customer Directory
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Manage enterprise client accounts, preferred currencies, and view associated quote volume.
            </p>
          </div>
          <CustomerFormModal />
        </div>

        {/* Customers Table */}
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {customers.length === 0 ? (
            <div className="p-12 text-center text-sm text-zinc-500">
              No customers found. Click "+ Add Customer" to create one.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
                <tr>
                  <th className="py-3.5 px-4">Company Name</th>
                  <th className="py-3.5 px-4">Contact Email</th>
                  <th className="py-3.5 px-4">Currency</th>
                  <th className="py-3.5 px-4">Total Quotes</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                    <td className="py-4 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                      {customer.companyName}
                    </td>
                    <td className="py-4 px-4 text-zinc-600 dark:text-zinc-400">
                      {customer.contacts.find((c) => c.isPrimary)?.email || customer.contacts[0]?.email || "—"}
                    </td>
                    <td className="py-4 px-4 font-mono text-xs uppercase text-zinc-500">
                      {customer.preferredCurrency || "INR"}
                    </td>
                    <td className="py-4 px-4 text-zinc-600 dark:text-zinc-400">
                      {customer._count.quotes} quotes
                    </td>
                    <td className="py-4 px-4 text-right">
                      <DeleteCustomerButton
                        customerId={customer.id}
                        quoteCount={customer._count.quotes}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}