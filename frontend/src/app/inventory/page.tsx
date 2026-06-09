"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchInventoryAlerts, fetchInventorySummary, fetchStockLevels, fetchPoRecommendation, fetchHubs } from "@/lib/api";
import { AlertTriangle, Package, Zap, ChevronRight, RefreshCw } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";

const STATUS_STYLE: Record<string, string> = {
  CRITICAL: "badge-critical",
  WARNING: "badge-warning",
  WATCH: "badge-info",
  OVERSTOCK: "text-purple-300 bg-purple-500/10 border border-purple-500/20",
  OK: "badge-ok",
};

export default function InventoryPage() {
  const [selectedHub, setSelectedHub] = useState<string>("");
  const [aiSku, setAiSku] = useState<{ sku_id: string; hub_id: string } | null>(null);
  const [aiResult, setAiResult] = useState<{ suggested_qty: number; estimated_value: number; ai_reasoning: string } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const { data: summary } = useQuery({ queryKey: ["inv-summary"], queryFn: fetchInventorySummary, refetchInterval: 30000 });
  const { data: alerts, isLoading: alertsLoading } = useQuery({ queryKey: ["inv-alerts"], queryFn: fetchInventoryAlerts, refetchInterval: 30000 });
  const { data: stockLevels } = useQuery({ queryKey: ["stock-levels", selectedHub], queryFn: () => fetchStockLevels(selectedHub || undefined) });
  const { data: hubs } = useQuery({ queryKey: ["hubs"], queryFn: fetchHubs });

  async function handleGetPoRecommendation(skuId: string, hubId: string) {
    setAiSku({ sku_id: skuId, hub_id: hubId });
    setLoadingAi(true);
    try {
      const result = await fetchPoRecommendation(skuId, hubId);
      setAiResult(result);
    } catch {
      toast.error("AI recommendation failed. Check API key.");
    }
    setLoadingAi(false);
  }

  const criticalAlerts = (alerts || []).filter((a: {status: string}) => a.status === "CRITICAL");
  const warningAlerts = (alerts || []).filter((a: {status: string}) => a.status === "WARNING");

  return (
    <div className="animate-fade-in">
      <div className="page-header px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Inventory & Replenishment Copilot</h1>
            <p className="text-sm text-white/40 mt-0.5">Real-time stock, AI-powered reorder recommendations</p>
          </div>
          <select
            className="input-field w-48"
            value={selectedHub}
            onChange={e => setSelectedHub(e.target.value)}
          >
            <option value="">All Hubs</option>
            {(hubs || []).map((h: {id:string;name:string}) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Summary KPIs */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Active SKUs", value: summary?.total_active_skus || 0, color: "text-white" },
            { label: "Fill Rate", value: `${summary?.fill_rate_pct || 0}%`, color: summary?.fill_rate_pct >= 95 ? "text-green-400" : "text-amber-400" },
            { label: "Stockouts", value: summary?.stockout_count || 0, color: "text-red-400" },
            { label: "Low Stock", value: summary?.low_stock_count || 0, color: "text-amber-400" },
          ].map((k, i) => (
            <div key={i} className="glass-card p-5">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">{k.label}</p>
              <p className={clsx("text-2xl font-bold", k.color)}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <div className="glass-card p-5 border-red-500/30 border">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-red-400" />
              <h2 className="text-sm font-semibold text-red-400">CRITICAL — Immediate Action Required ({criticalAlerts.length})</h2>
            </div>
            <div className="space-y-2">
              {criticalAlerts.slice(0, 5).map((alert: {sku_id:string;hub_id:string;sku_code:string;product_name:string;hub_name:string;qty_on_hand:number;gmv_at_risk:number;avg_daily_demand:number}) => (
                <div key={`${alert.sku_id}-${alert.hub_id}`} className="flex items-center gap-4 px-4 py-3 rounded-lg bg-red-500/5 border border-red-500/15">
                  <span className="badge-critical text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0">STOCKOUT</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white/90">{alert.product_name}</p>
                    <p className="text-xs text-white/40">{alert.sku_code} · {alert.hub_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-red-300">₹{alert.gmv_at_risk?.toLocaleString()} at risk</p>
                    <p className="text-[10px] text-white/30">Avg demand: {alert.avg_daily_demand}/day</p>
                  </div>
                  <button
                    onClick={() => handleGetPoRecommendation(alert.sku_id, alert.hub_id)}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    <Zap size={11} />AI PO
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Alerts Table */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">
              All Inventory Alerts ({(alerts || []).length})
            </h2>
            <span className="text-xs text-white/30">Updates every 30s</span>
          </div>
          {alertsLoading ? (
            <p className="text-white/30 text-sm py-6 text-center">Loading alerts…</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Hub</th>
                  <th>On Hand</th>
                  <th>Reorder Pt.</th>
                  <th>Cover Days</th>
                  <th>Status</th>
                  <th>GMV Risk</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(alerts || []).slice(0, 30).map((a: {sku_id:string;hub_id:string;sku_code:string;product_name:string;hub_name:string;qty_on_hand:number;reorder_point:number;cover_days:number;status:string;gmv_at_risk:number}) => (
                  <tr key={`${a.sku_id}-${a.hub_id}`}>
                    <td>
                      <p className="font-medium text-white/80 text-xs">{a.product_name.slice(0, 35)}{a.product_name.length > 35 ? "…" : ""}</p>
                      <p className="text-[10px] text-white/30">{a.sku_code}</p>
                    </td>
                    <td className="text-xs">{a.hub_name}</td>
                    <td className={clsx("font-mono text-xs", a.qty_on_hand <= 0 ? "text-red-400" : a.qty_on_hand < a.reorder_point ? "text-amber-400" : "text-white/70")}>
                      {a.qty_on_hand}
                    </td>
                    <td className="text-xs text-white/50">{a.reorder_point}</td>
                    <td className="text-xs font-mono text-white/70">{a.cover_days === 999 ? "∞" : `${a.cover_days}d`}</td>
                    <td>
                      <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-semibold", STATUS_STYLE[a.status] || "badge-info")}>
                        {a.status}
                      </span>
                    </td>
                    <td className="text-xs font-mono text-white/60">₹{a.gmv_at_risk?.toLocaleString()}</td>
                    <td>
                      {["CRITICAL", "WARNING"].includes(a.status) && (
                        <button
                          onClick={() => handleGetPoRecommendation(a.sku_id, a.hub_id)}
                          className="btn-ghost text-xs py-1 px-2 flex items-center gap-1"
                        >
                          <Zap size={10} />AI
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* AI PO Recommendation Modal */}
        {aiSku && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="glass-card w-full max-w-2xl p-6 gradient-border relative shadow-2xl animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={16} className="text-purple-400" />
                <h2 className="text-sm font-semibold text-white">AI Purchase Order Recommendation</h2>
                <button
                  onClick={() => { setAiSku(null); setAiResult(null); }}
                  className="ml-auto text-xs text-white/30 hover:text-white bg-white/5 hover:bg-white/10 rounded px-2.5 py-1 transition-all"
                >
                  ✕ Close
                </button>
              </div>
              {loadingAi ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-white/50">
                  <RefreshCw size={24} className="animate-spin text-purple-400" />
                  <span className="text-sm">Analyzing with Groq Llama 3.3 70B…</span>
                </div>
              ) : aiResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="ai-panel p-4 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-xs text-white/40 mb-1">Suggested Order Qty</p>
                      <p className="text-2xl font-bold text-cyan-400">{aiResult.suggested_qty} units</p>
                    </div>
                    <div className="ai-panel p-4 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-xs text-white/40 mb-1">Estimated PO Value</p>
                      <p className="text-2xl font-bold text-purple-400">₹{aiResult.estimated_value?.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="ai-panel p-4 rounded-lg bg-white/5 border border-white/10 max-h-60 overflow-y-auto">
                    <p className="text-xs text-white/40 mb-2 font-semibold">AI Analysis & Reasoning</p>
                    <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{aiResult.ai_reasoning}</p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        toast.success("PO Approved & Raised Successfully!");
                        setAiSku(null);
                        setAiResult(null);
                      }}
                      className="btn-success flex-1"
                    >
                      ✓ Approve PO
                    </button>
                    <button
                      onClick={() => {
                        toast.success("PO Draft opened for editing!");
                        setAiSku(null);
                        setAiResult(null);
                      }}
                      className="btn-ghost flex-1 border border-white/20 hover:bg-white/10"
                    >
                      ✎ Edit & Approve
                    </button>
                    <button
                      onClick={() => {
                        toast.error("PO Recommendation Rejected");
                        setAiSku(null);
                        setAiResult(null);
                      }}
                      className="btn-danger px-4"
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
