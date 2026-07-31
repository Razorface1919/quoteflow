// src/components/customers/CustomerFormModal.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CustomerFormModal() {
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, email, preferredCurrency: currency }),
      });

      if (!res.ok) throw new Error("Failed to create customer");

      setOpen(false);
      setCompanyName("");
      setEmail("");
      router.refresh();
    } catch (err) {
      alert("Error adding customer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white shadow hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
      >
        + Add Customer
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h2 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100">Add New Customer</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase">Company Name</label>
                <input
                  required
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  placeholder="e.g. Agni Robotics India"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase">Contact Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  placeholder="contact@company.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase">Preferred Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded px-4 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  {loading ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}