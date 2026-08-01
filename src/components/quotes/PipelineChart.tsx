"use client";

import React, { ReactNode } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type StatusGroup = {
  status: string;
  totalValue: number;
  count: number;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
};

const getStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; color: string; fill: string }> = {
    CLOSED_WON: { label: "Closed Won", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", fill: "#10b981" },
    DRAFT: { label: "Draft", color: "bg-slate-500/10 text-slate-400 border-slate-500/20", fill: "#94a3b8" },
    CLOSED_LOST: { label: "Closed Lost", color: "bg-red-500/10 text-red-500 border-red-500/20", fill: "#ef4444" },
    PENDING_APPROVAL: { label: "Pending Approval", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", fill: "#f59e0b" },
    APPROVED: { label: "Approved", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", fill: "#3b82f6" },
    SENT: { label: "Sent", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", fill: "#6366f1" },
  };
  return configs[status] || { label: status, color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", fill: "#a1a1aa" };
};

export default function PipelineChart({ data }: { data: StatusGroup[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis type="number" stroke="#475569" tickFormatter={(value) => `₹${value}`} />
            <YAxis dataKey="status" type="category" hide />
            <Tooltip
              cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
              contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc" }}
              formatter={(value: any) => {
                let formattedValue = String(value ?? "");
                if (typeof value === "number") {
                  formattedValue = formatCurrency(value);
                } else if (Array.isArray(value)) {
                  formattedValue = value.map(v => typeof v === "number" ? formatCurrency(v) : String(v)).join(", ");
                }
                
                // Return [value, name] to explicitly set the tooltip label
                return [formattedValue, "Total Value"]; 
              }}
              labelFormatter={(label: ReactNode) => getStatusConfig(String(label ?? "")).label}
            />
            <Bar dataKey="totalValue" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getStatusConfig(entry.status).fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-4 flex flex-col justify-center">
        {data.map((row) => {
          const config = getStatusConfig(row.status);
          return (
            <div key={row.status} className="flex items-center justify-between border-b border-slate-800/50 pb-3 last:border-0 last:pb-0">
              <span className={`px-2.5 py-0.5 rounded-md border text-xs font-semibold tracking-wide ${config.color}`}>
                {config.label}
              </span>
              <div className="text-right flex items-center gap-6">
                <div className="text-sm text-slate-400">
                  Count: <span className="text-slate-200 font-medium">{row.count}</span>
                </div>
                <div className="text-sm text-slate-400 w-32">
                  Value: <span className="text-slate-200 font-medium">{formatCurrency(row.totalValue)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}