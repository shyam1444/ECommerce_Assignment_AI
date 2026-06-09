"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDailyReview, fetchCategoryPerformance } from "@/lib/api";
import { TrendingUp, FileText, Download, Calendar, ArrowUpRight, BarChart, AlertTriangle, ShieldCheck } from "lucide-react";

export default function ReviewsPage() {
  const [reportDays, setReportDays] = useState(7);

  const { data: reviewData, isLoading: reviewLoading } = useQuery({
    queryKey: ["dailyBusinessReview"],
    queryFn: fetchDailyReview,
  });

  const { data: catPerf, isLoading: catPerfLoading } = useQuery({
    queryKey: ["categoryPerformance", reportDays],
    queryFn: () => fetchCategoryPerformance(reportDays),
  });

  const kpis = reviewData?.data;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Header */}
      <header className="page-header px-8 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="text-cyan-400" size={24} />
              Business Review Generator
            </h1>
            <p className="text-xs text-white/50 mt-1">
              AI-generated Daily and Weekly Business Review summaries, margin bridge, and analytics reports.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="btn-ghost text-xs flex items-center gap-1.5 py-1.5"
            >
              <Download size={14} />
              Export PDF
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="p-8 space-y-6">
        {/* Date / Metadata Info */}
        <div className="flex items-center gap-3 text-xs text-white/45 bg-white/[0.02] border border-white/[0.05] p-3 rounded-lg w-fit">
          <Calendar size={14} className="text-cyan-400" />
          <span>Reporting Period:</span>
          <span className="font-semibold text-white/80">{kpis?.period || "Last 7 days"}</span>
          <span>·</span>
          <span>Generated At:</span>
          <span className="font-semibold text-white/80">{reviewData?.report_date || "Today"}</span>
        </div>

        {/* Top KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-card p-5">
            <p className="text-xs font-semibold text-white/45 uppercase tracking-wider">Gross GMV</p>
            <p className="metric-value mt-2">{kpis ? formatCurrency(kpis.gmv_inr) : "₹0"}</p>
            <div className="flex items-center gap-1.5 mt-3 text-xs text-white/40">
              <span className="text-white/60">Target: ₹20.0L</span>
              <span className={`font-semibold ${kpis && kpis.gmv_inr >= kpis.gmv_target_inr ? "text-emerald-400" : "text-amber-400"}`}>
                {kpis ? `${roundPct(kpis.gmv_inr / kpis.gmv_target_inr * 100)}%` : "0%"}
              </span>
            </div>
          </div>

          <div className="glass-card p-5">
            <p className="text-xs font-semibold text-white/45 uppercase tracking-wider">Gross Margin</p>
            <p className="metric-value text-cyan-400 mt-2">{kpis ? `${kpis.gross_margin_pct}%` : "0%"}</p>
            <div className="flex items-center gap-1.5 mt-3 text-xs text-white/40">
              <span className="text-white/60">Target: 18.0%</span>
              <span className={`font-semibold ${kpis && kpis.gross_margin_pct >= kpis.margin_target_pct ? "text-emerald-400" : "text-amber-400"}`}>
                {kpis ? `${(kpis.gross_margin_pct - kpis.margin_target_pct).toFixed(1)}pp` : "0pp"}
              </span>
            </div>
          </div>

          <div className="glass-card p-5">
            <p className="text-xs font-semibold text-white/45 uppercase tracking-wider">Stockouts</p>
            <p className="metric-value text-red-400 mt-2">{kpis?.active_stockouts || 0}</p>
            <div className="flex items-center gap-1.5 mt-3 text-xs text-white/40">
              <span className="text-red-400/80 flex items-center gap-1">
                <AlertTriangle size={12} />
                SKUs with zero inventory
              </span>
            </div>
          </div>

          <div className="glass-card p-5">
            <p className="text-xs font-semibold text-white/45 uppercase tracking-wider">Vendor Risk Alerts</p>
            <p className="metric-value text-amber-400 mt-2">{kpis?.vendor_issues || 0}</p>
            <div className="flex items-center gap-1.5 mt-3 text-xs text-white/40">
              <span className="text-amber-400 flex items-center gap-1">
                <ShieldCheck size={12} />
                Critical performance reviews
              </span>
            </div>
          </div>
        </div>

        {/* AI Business Commentary Narrative */}
        <div className="glass-card p-6 border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-cyan-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -z-10" />
          <div className="flex items-center justify-between mb-4 border-b border-white/[0.06] pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <FileText size={14} />
              AI Business Executive Narrative
            </span>
            <span className="text-[10px] text-white/40">Llama-3.3-70b-versatile Agent</span>
          </div>

          {reviewLoading ? (
            <div className="space-y-4">
              <div className="h-4 bg-white/5 rounded animate-pulse" />
              <div className="h-4 bg-white/5 rounded animate-pulse" />
              <div className="h-4 bg-white/5 rounded w-5/6 animate-pulse" />
              <div className="h-4 bg-white/5 rounded animate-pulse" />
              <div className="h-4 bg-white/5 rounded w-3/4 animate-pulse" />
            </div>
          ) : (
            <div className="text-sm text-white/80 leading-relaxed whitespace-pre-line font-sans prose prose-invert max-w-none">
              {reviewData?.narrative || "No narrative generated yet. Check API key settings."}
            </div>
          )}
        </div>

        {/* Category Performance Matrix */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
              <BarChart size={16} className="text-cyan-400" />
              Category Target Breakdown
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">Aggregated for:</span>
              <select
                className="input-field py-1"
                value={reportDays}
                onChange={(e) => setReportDays(Number(e.target.value))}
              >
                <option value={7}>Last 7 Days</option>
                <option value={14}>Last 14 Days</option>
                <option value={30}>Last 30 Days</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>SKU Count</th>
                  <th>Units Sold</th>
                  <th>GMV (INR)</th>
                  <th>Gross Profit</th>
                  <th>Margin %</th>
                  <th>Target %</th>
                  <th className="text-right">SLA / Status</th>
                </tr>
              </thead>
              <tbody>
                {catPerfLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-white/30 animate-pulse">
                      Loading category target metrics...
                    </td>
                  </tr>
                ) : !catPerf || catPerf.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-white/30">
                      No category metrics found.
                    </td>
                  </tr>
                ) : (
                  catPerf.map((row: any) => (
                    <tr key={row.category}>
                      <td className="font-semibold text-white">{row.category}</td>
                      <td>{row.sku_count}</td>
                      <td>{row.units_sold}</td>
                      <td className="font-mono text-xs">{formatCurrency(row.gmv)}</td>
                      <td className="font-mono text-xs">{formatCurrency(row.gross_profit)}</td>
                      <td className="font-semibold">{row.margin_pct}%</td>
                      <td className="text-white/40">{row.target_margin_pct}%</td>
                      <td className="text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.on_target ? "badge-ok" : "badge-critical"}`}>
                          {row.on_target ? "ON TARGET" : "UNDER TARGET"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function roundPct(val: number) {
  return val.toFixed(0);
}
