"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type StatusGroup = {
  status: string;
  totalValue: number;
  count: number;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD", // Adjust to INR if needed based on your default currency
    maximumFractionDigits: 2,
  }).format(value);
};

const getStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; color: string; fill: string }> = {
    CLOSED_WON: { label: "Closed Won", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900", fill: "#10b981" },
    DRAFT: { label: "Draft", color: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800", fill: "#71717a" },
    CLOSED_LOST: { label: "Closed Lost", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900", fill: "#ef4444" },
    PENDING_APPROVAL: { label: "Pending Approval", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900", fill: "#f59e0b" },
    APPROVED: { label: "Approved", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900", fill: "#3b82f6" },
    SENT: { label: "Sent", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900", fill: "#6366f1" },
    UNDER_NEGOTIATION: { label: "Negotiating", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900", fill: "#a855f7" },
  };
  return configs[status] || { label: status, color: "bg-zinc-500/10 text-zinc-500 border-zinc-200", fill: "#a1a1aa" };
};

export default function PipelineChart({ data }: { data: StatusGroup[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
      {/* Visual Chart Section */}
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis type="number" stroke="#71717a" tickFormatter={(value) => `$${value}`} />
            <YAxis dataKey="status" type="category" hide />
            <Tooltip
              cursor={{ fill: "rgba(113, 113, 122, 0.1)" }}
              contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px", color: "#f4f4f5" }}
              formatter={(value) => formatCurrency(typeof value === 'number' ? value : 0)}
              labelFormatter={(label) => getStatusConfig(String(label)).label}
            />
            <Bar dataKey="totalValue" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getStatusConfig(entry.status).fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Formatted Tabular Section */}
      <div className="space-y-4 flex flex-col justify-center">
        {data.map((row) => {
          const config = getStatusConfig(row.status);
          return (
            <div key={row.status} className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 last:border-0 last:pb-0">
              <span className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold tracking-wide ${config.color}`}>
                {config.label}
              </span>
              <div className="text-right flex items-center gap-6">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  Count: <span className="text-zinc-900 dark:text-zinc-100 font-medium">{row.count}</span>
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400 w-28">
                  Value: <span className="text-zinc-900 dark:text-zinc-100 font-medium">{formatCurrency(row.totalValue)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}