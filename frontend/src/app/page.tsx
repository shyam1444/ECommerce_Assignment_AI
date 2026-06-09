"use client";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend
} from "recharts";
import { fetchCockpit, fetchGmvTrend, fetchCategoryPerformance } from "@/lib/api";
import { TrendingUp, Package, AlertTriangle, CheckSquare, Users, DollarSign, Zap, ArrowUpRight } from "lucide-react";
import clsx from "clsx";

const SEVERITY_STYLE: Record<string, string> = {
  CRITICAL: "badge-critical",
  WARNING: "badge-warning",
  INFO: "badge-info",
};

function formatINR(val: number) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val.toFixed(0)}`;
}

const PIE_COLORS = ["#7c3aed", "#00d4ff", "#10b981", "#f59e0b", "#ec4899"];

export default function ExecutiveCockpit() {
  const { data: cockpit, isLoading: cockpitLoading } = useQuery({
    queryKey: ["cockpit"],
    queryFn: fetchCockpit,
    refetchInterval: 60000,
  });
  const { data: gmvTrend } = useQuery({
    queryKey: ["gmv-trend"],
    queryFn: () => fetchGmvTrend(14),
  });
  const { data: categoryPerf } = useQuery({
    queryKey: ["category-perf"],
    queryFn: () => fetchCategoryPerformance(30),
  });

  const kpis = cockpit?.kpis || {};

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Executive Cockpit</h1>
            <p className="text-sm text-white/40 mt-0.5">
              Live category intelligence — {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400 font-medium">Live</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "GMV (7 Days)",
              value: formatINR(kpis.gmv_7d || 0),
              icon: TrendingUp,
              color: "text-cyan-400",
              bg: "from-cyan-500/10 to-transparent",
              border: "border-cyan-500/20",
              sub: `30d: ${formatINR(kpis.gmv_30d || 0)}`,
            },
            {
              label: "Gross Margin",
              value: `${kpis.gross_margin_pct_7d || 0}%`,
              icon: DollarSign,
              color: "text-purple-400",
              bg: "from-purple-500/10 to-transparent",
              border: "border-purple-500/20",
              sub: "Target: 18%",
            },
            {
              label: "Fill Rate",
              value: `${kpis.fill_rate_pct || 0}%`,
              icon: Package,
              color: kpis.fill_rate_pct >= 95 ? "text-green-400" : "text-amber-400",
              bg: kpis.fill_rate_pct >= 95 ? "from-green-500/10 to-transparent" : "from-amber-500/10 to-transparent",
              border: kpis.fill_rate_pct >= 95 ? "border-green-500/20" : "border-amber-500/20",
              sub: `${kpis.stockout_count || 0} stockouts`,
            },
            {
              label: "Pending Approvals",
              value: kpis.pending_approvals || 0,
              icon: CheckSquare,
              color: kpis.high_risk_approvals > 0 ? "text-red-400" : "text-white/70",
              bg: kpis.high_risk_approvals > 0 ? "from-red-500/10 to-transparent" : "from-white/5 to-transparent",
              border: kpis.high_risk_approvals > 0 ? "border-red-500/20" : "border-white/10",
              sub: `${kpis.high_risk_approvals || 0} high-risk`,
            },
          ].map((kpi, i) => (
            <div
              key={i}
              className={clsx("glass-card p-5 bg-gradient-to-br border", kpi.bg, kpi.border)}
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">{kpi.label}</p>
                <kpi.icon size={16} className={kpi.color} />
              </div>
              <p className={clsx("text-2xl font-bold", kpi.color)}>{cockpitLoading ? "—" : kpi.value}</p>
              <p className="text-xs text-white/30 mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Active SKUs", value: kpis.total_active_skus || 0, color: "text-white/80" },
            { label: "Low Stock", value: kpis.low_stock_count || 0, color: "text-amber-400" },
            { label: "Stockouts", value: kpis.stockout_count || 0, color: "text-red-400" },
            { label: "Red Vendors", value: kpis.red_vendors || 0, color: "text-red-400" },
            { label: "Yellow Vendors", value: kpis.yellow_vendors || 0, color: "text-amber-400" },
            { label: "High-Risk Items", value: kpis.high_risk_approvals || 0, color: "text-red-400" },
          ].map((item, i) => (
            <div key={i} className="glass-card px-4 py-3 text-center">
              <p className={clsx("text-xl font-bold", item.color)}>{item.value}</p>
              <p className="text-[11px] text-white/35 mt-1">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-3 gap-5">
          {/* GMV Trend */}
          <div className="col-span-2 glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">GMV Trend — Last 14 Days</h2>
                <p className="text-xs text-white/40">Daily gross merchandise value</p>
              </div>
              <ArrowUpRight size={14} className="text-cyan-400" />
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={gmvTrend || []} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} tickFormatter={v => formatINR(v)} width={55} />
                <Tooltip
                  contentStyle={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [formatINR(v), "GMV"]}
                  labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                />
                <Area type="monotone" dataKey="gmv" stroke="#00d4ff" strokeWidth={2} fill="url(#gmvGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Category Pie */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-white mb-1">GMV by Category</h2>
            <p className="text-xs text-white/40 mb-3">Last 30 days</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={categoryPerf || []}
                  dataKey="gmv"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={65}
                  innerRadius={35}
                >
                  {(categoryPerf || []).map((_: unknown, index: number) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number) => [formatINR(v), "GMV"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights + Category Table */}
        <div className="grid grid-cols-5 gap-5">
          {/* AI Insights */}
          <div className="col-span-2 glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={14} className="text-purple-400" />
              <h2 className="text-sm font-semibold text-white">AI Insights</h2>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                {cockpit?.ai_insights?.length || 0} active
              </span>
            </div>
            <div className="space-y-3">
              {(cockpit?.ai_insights || []).map((insight: {id:string; severity:string; insight_type:string; insight_text:string; module:string}) => (
                <div key={insight.id} className="ai-panel p-3">
                  <div className="flex items-start gap-2">
                    <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 mt-0.5", SEVERITY_STYLE[insight.severity] || "badge-info")}>
                      {insight.severity}
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold text-white/70 mb-0.5">{insight.insight_type.replace(/_/g, " ")}</p>
                      <p className="text-[11px] text-white/50 leading-relaxed">{insight.insight_text}</p>
                    </div>
                  </div>
                </div>
              ))}
              {(!cockpit?.ai_insights?.length) && (
                <p className="text-sm text-white/30 text-center py-4">No active insights</p>
              )}
            </div>
          </div>

          {/* Category Performance Table */}
          <div className="col-span-3 glass-card p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Category Performance — 30 Days</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>GMV</th>
                  <th>Margin %</th>
                  <th>Target</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(categoryPerf || []).map((cat: {category:string;gmv:number;margin_pct:number;target_margin_pct:number;on_target:boolean}) => (
                  <tr key={cat.category}>
                    <td className="font-medium text-white/80">{cat.category}</td>
                    <td className="font-mono">{formatINR(cat.gmv)}</td>
                    <td className={clsx("font-semibold", cat.margin_pct >= cat.target_margin_pct ? "text-green-400" : "text-amber-400")}>
                      {cat.margin_pct.toFixed(1)}%
                    </td>
                    <td className="text-white/40">{cat.target_margin_pct}%</td>
                    <td>
                      <span className={clsx("text-[10px] px-2 py-0.5 rounded-full", cat.on_target ? "badge-ok" : "badge-warning")}>
                        {cat.on_target ? "✓ On Target" : "⚠ Below"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
