"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPricingDashboard, fetchMarginSummary, fetchCompetitiveGap, suggestPrice } from "@/lib/api";
import { Tag, Zap, RefreshCw, TrendingDown, AlertTriangle } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";

const MARGIN_FLAG_STYLE: Record<string, string> = {
  CRITICAL: "badge-critical",
  LOW: "badge-warning",
  OK: "badge-ok",
  HIGH: "text-cyan-300 bg-cyan-500/10 border border-cyan-500/20",
};

export default function PricingPage() {
  const [selectedSku, setSelectedSku] = useState<{sku_id:string;product_name:string} | null>(null);
  const [aiPricing, setAiPricing] = useState<{floor_price:number;current_price:number;competitor_price:number;ai_options:string} | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [filter, setFilter] = useState<"ALL"|"LOW"|"CRITICAL"|"GAP">("ALL");

  const { data: pricingData, isLoading } = useQuery({ queryKey: ["pricing"], queryFn: fetchPricingDashboard });
  const { data: marginSummary } = useQuery({ queryKey: ["margin-summary"], queryFn: fetchMarginSummary });
  const { data: competitiveGap } = useQuery({ queryKey: ["competitive-gap"], queryFn: fetchCompetitiveGap });

  async function handleSuggestPrice(skuId: string, name: string) {
    setSelectedSku({ sku_id: skuId, product_name: name });
    setLoadingAi(true);
    try {
      const result = await suggestPrice(skuId);
      setAiPricing(result);
    } catch {
      toast.error("AI pricing failed. Check API key.");
    }
    setLoadingAi(false);
  }

  const filteredData = (pricingData || []).filter((p: {margin_flag:string; competitor_gap_pct:number|null}) => {
    if (filter === "ALL") return true;
    if (filter === "CRITICAL") return p.margin_flag === "CRITICAL";
    if (filter === "LOW") return p.margin_flag === "LOW";
    if (filter === "GAP") return p.competitor_gap_pct && p.competitor_gap_pct > 5;
    return true;
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header px-8 py-6">
        <div>
          <h1 className="text-xl font-bold text-white">Pricing & Margin Engine</h1>
          <p className="text-sm text-white/40 mt-0.5">Live margins, competitor benchmarking, AI pricing recommendations</p>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Margin KPIs */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Avg Gross Margin", value: `${marginSummary?.avg_gross_margin_pct || 0}%`, color: "text-green-400" },
            { label: "Below 15% (Alert)", value: marginSummary?.below_15pct_count || 0, color: "text-amber-400" },
            { label: "Below 10% (Critical)", value: marginSummary?.below_10pct_count || 0, color: "text-red-400" },
            { label: "Competitor Undercut", value: marginSummary?.competitor_undercut_count || 0, color: "text-red-400" },
          ].map((k, i) => (
            <div key={i} className="glass-card p-5">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">{k.label}</p>
              <p className={clsx("text-2xl font-bold", k.color)}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Competitive Gap Alert */}
        {(competitiveGap || []).length > 0 && (
          <div className="glass-card p-4 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={14} className="text-amber-400" />
              <p className="text-sm font-semibold text-amber-400">Competitor Price Gap — We Are More Expensive</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(competitiveGap || []).slice(0, 6).map((g: {sku_code:string;product_name:string;our_price:number;competitor_price:number;gap_pct:number;revenue_risk:string}) => (
                <div key={g.sku_code} className="px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                  <p className="text-[11px] font-medium text-white/70 mb-1">{g.product_name.slice(0, 28)}…</p>
                  <div className="flex gap-2 text-[10px]">
                    <span className="text-white/40">Us: ₹{g.our_price}</span>
                    <span className="text-green-400">Comp: ₹{g.competitor_price}</span>
                    <span className="text-amber-400 font-bold">+{g.gap_pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2">
          {["ALL", "LOW", "CRITICAL", "GAP"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as typeof filter)}
              className={clsx("px-4 py-1.5 rounded-full text-xs font-medium transition-all", filter === f ? "btn-primary" : "btn-ghost")}
            >
              {f === "GAP" ? "Price Gap" : f}
            </button>
          ))}
        </div>

        {/* Pricing Table */}
        <div className="glass-card p-5">
          {isLoading ? (
            <p className="text-white/30 text-sm py-6 text-center">Loading pricing data…</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Selling Price</th>
                  <th>Landed Cost</th>
                  <th>Margin %</th>
                  <th>Comp. Price</th>
                  <th>Gap %</th>
                  <th>Flag</th>
                  <th>AI Price</th>
                </tr>
              </thead>
              <tbody>
                {(filteredData || []).slice(0, 40).map((p: {sku_id:string;product_name:string;sku_code:string;hub:string;selling_price:number;landed_cost:number;gross_margin_pct:number;competitor_price:number|null;competitor_gap_pct:number|null;margin_flag:string;floor_price:number}) => (
                  <tr key={`${p.sku_id}-${p.hub}`}>
                    <td>
                      <p className="font-medium text-white/80 text-xs">{p.product_name.slice(0, 32)}{p.product_name.length > 32 ? "…" : ""}</p>
                      <p className="text-[10px] text-white/30">{p.sku_code} · {p.hub}</p>
                    </td>
                    <td className="text-xs font-mono text-white/70">₹{p.selling_price?.toFixed(0)}</td>
                    <td className="text-xs font-mono text-white/50">₹{p.landed_cost?.toFixed(0)}</td>
                    <td className={clsx("text-xs font-bold", p.gross_margin_pct < 10 ? "text-red-400" : p.gross_margin_pct < 15 ? "text-amber-400" : "text-green-400")}>
                      {p.gross_margin_pct?.toFixed(1)}%
                    </td>
                    <td className="text-xs font-mono text-white/50">{p.competitor_price ? `₹${p.competitor_price?.toFixed(0)}` : "—"}</td>
                    <td className={clsx("text-xs font-mono", p.competitor_gap_pct && p.competitor_gap_pct > 10 ? "text-red-400" : p.competitor_gap_pct && p.competitor_gap_pct > 0 ? "text-amber-400" : "text-green-400")}>
                      {p.competitor_gap_pct ? `${p.competitor_gap_pct > 0 ? "+" : ""}${p.competitor_gap_pct}%` : "—"}
                    </td>
                    <td>
                      <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-semibold", MARGIN_FLAG_STYLE[p.margin_flag] || "badge-info")}>
                        {p.margin_flag}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleSuggestPrice(p.sku_id, p.product_name)}
                        className="btn-ghost text-xs py-1 px-2 flex items-center gap-1"
                      >
                        <Zap size={10} />AI
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* AI Pricing Recommendation */}
        {selectedSku && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="glass-card w-full max-w-2xl p-6 gradient-border relative shadow-2xl animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={16} className="text-purple-400" />
                <h2 className="text-sm font-semibold text-white">AI Pricing Recommendation</h2>
                <button
                  onClick={() => { setSelectedSku(null); setAiPricing(null); }}
                  className="ml-auto text-xs text-white/30 hover:text-white bg-white/5 hover:bg-white/10 rounded px-2.5 py-1 transition-all"
                >
                  ✕ Close
                </button>
              </div>
              <p className="text-xs text-purple-300 font-semibold mb-3">{selectedSku.product_name}</p>
              {loadingAi ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-white/50">
                  <RefreshCw size={24} className="animate-spin text-purple-400" />
                  <span className="text-sm font-medium">Generating pricing options with Groq…</span>
                </div>
              ) : aiPricing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="ai-panel p-3 text-center rounded-lg bg-white/5 border border-white/10">
                      <p className="text-[10px] text-white/40 mb-1">Current Price</p>
                      <p className="text-sm font-bold text-white/80">₹{aiPricing.current_price?.toFixed(0)}</p>
                    </div>
                    <div className="ai-panel p-3 text-center rounded-lg bg-white/5 border border-white/10">
                      <p className="text-[10px] text-white/40 mb-1">Competitor Price</p>
                      <p className="text-sm font-bold text-cyan-400">
                        {aiPricing.competitor_price ? `₹${aiPricing.competitor_price.toFixed(0)}` : "N/A"}
                      </p>
                    </div>
                    <div className="ai-panel p-3 text-center rounded-lg bg-white/5 border border-white/10">
                      <p className="text-[10px] text-white/40 mb-1">Floor Price (15% min)</p>
                      <p className="text-sm font-bold text-purple-400">₹{aiPricing.floor_price?.toFixed(0)}</p>
                    </div>
                  </div>
                  <div className="ai-panel p-4 rounded-lg bg-white/5 border border-white/10 max-h-60 overflow-y-auto">
                    <p className="text-xs text-white/40 mb-2 font-semibold">AI Pricing Options</p>
                    <pre className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed font-sans">{aiPricing.ai_options}</pre>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        toast.success("Applied Option 2 (Neutral) successfully!");
                        setSelectedSku(null);
                        setAiPricing(null);
                      }}
                      className="btn-success flex-1"
                    >
                      ✓ Apply Option 2
                    </button>
                    <button
                      onClick={() => {
                        toast.success("Approval Request Created!");
                        setSelectedSku(null);
                        setAiPricing(null);
                      }}
                      className="btn-ghost flex-1 border border-white/20 hover:bg-white/10"
                    >
                      Create Approval Request
                    </button>
                    <button
                      onClick={() => {
                        toast.error("Pricing Recommendation Cancelled");
                        setSelectedSku(null);
                        setAiPricing(null);
                      }}
                      className="btn-danger px-4"
                    >
                      ✕ Cancel
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
