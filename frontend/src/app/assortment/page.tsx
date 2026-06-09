"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSkuHealthMatrix, fetchAssortmentInsight, fetchCategories } from "@/lib/api";
import { BarChart3, TrendingUp, AlertTriangle, Trash2, ShieldAlert, Award, Search, Filter } from "lucide-react";

export default function AssortmentPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const { data: matrix, isLoading: matrixLoading } = useQuery({
    queryKey: ["skuHealthMatrix"],
    queryFn: fetchSkuHealthMatrix,
  });

  const { data: aiInsight, isLoading: insightLoading } = useQuery({
    queryKey: ["assortmentInsight"],
    queryFn: fetchAssortmentInsight,
  });

  // Filter matrix data
  const filteredData = matrix
    ? matrix.filter((item: any) => {
        const matchesSearch =
          item.product_name.toLowerCase().includes(search.toLowerCase()) ||
          item.sku_code.toLowerCase().includes(search.toLowerCase()) ||
          (item.brand && item.brand.toLowerCase().includes(search.toLowerCase()));

        if (selectedCategory === "ALL") return matchesSearch;
        
        // Find category name for selectedCategory ID
        const catObj = categories?.find((c: any) => c.id === selectedCategory);
        return catObj ? item.recommendation && matchesSearch : matchesSearch;
      })
    : [];

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-400";
    if (score >= 45) return "text-amber-400";
    if (score >= 25) return "text-orange-400";
    return "text-red-400";
  };

  const getBadgeClass = (score: number) => {
    if (score >= 70) return "badge-ok";
    if (score >= 45) return "badge-warning";
    return "badge-critical";
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Header */}
      <header className="page-header px-8 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="text-cyan-400" size={24} />
              Assortment Intelligence
            </h1>
            <p className="text-xs text-white/50 mt-1">
              AI-driven SKU performance analysis, velocity ranking, and delisting opportunities.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Auto-evaluation interval:</span>
            <span className="px-2 py-1 text-[10px] font-semibold bg-white/5 border border-white/10 rounded uppercase text-white/80">
              Weekly
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="p-8 space-y-6">
        {/* Top Analytics Cards & AI Insight */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats Column */}
          <div className="lg:col-span-1 space-y-4">
            <div className="glass-card p-5">
              <p className="text-xs font-semibold text-white/45 uppercase tracking-wider">Total Evaluated SKUs</p>
              <p className="metric-value mt-2">{matrix?.length || 0}</p>
              <div className="flex items-center gap-2 mt-4 text-xs text-white/40">
                <TrendingUp size={14} className="text-emerald-400" />
                <span>100% catalog coverage refreshed today</span>
              </div>
            </div>

            <div className="glass-card p-5">
              <p className="text-xs font-semibold text-white/45 uppercase tracking-wider">Delist Candidates</p>
              <p className="metric-value text-red-400 mt-2">
                {aiInsight?.delist_candidates?.length || 0}
              </p>
              <div className="flex items-center gap-2 mt-4 text-xs text-red-400/80">
                <AlertTriangle size={14} />
                <span>SKU health score &lt; 25/100</span>
              </div>
            </div>

            <div className="glass-card p-5">
              <p className="text-xs font-semibold text-white/45 uppercase tracking-wider">Top Performers</p>
              <p className="metric-value text-emerald-400 mt-2">
                {aiInsight?.promote_candidates?.length || 0}
              </p>
              <div className="flex items-center gap-2 mt-4 text-xs text-emerald-400/80">
                <Award size={14} />
                <span>SKU health score &ge; 70/100</span>
              </div>
            </div>
          </div>

          {/* AI Briefing Panel */}
          <div className="lg:col-span-2 glass-card p-6 border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-cyan-500/5 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -z-10" />
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <ShieldAlert size={14} />
                  AI Assortment Advisory
                </span>
                <span className="text-[10px] text-white/40">Powered by Llama 3.3</span>
              </div>
              {insightLoading ? (
                <div className="space-y-3">
                  <div className="h-4 bg-white/5 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-white/5 rounded animate-pulse" />
                  <div className="h-4 bg-white/5 rounded w-5/6 animate-pulse" />
                </div>
              ) : (
                <div className="text-sm text-white/80 leading-relaxed whitespace-pre-line">
                  {aiInsight?.insight || "No AI insights generated yet. Configure Groq API key to activate."}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-white/40">
              <span>Recommendations calculated using sales velocity, margins, and content score.</span>
              <button className="text-cyan-400 hover:underline">View delist framework &rarr;</button>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 text-white/30" size={16} />
              <input
                type="text"
                placeholder="Search SKUs by name, brand, or code..."
                className="input-field pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-white/40" />
              <select
                className="input-field py-1.5"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="ALL">All Categories</option>
                {categories?.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-xs text-white/40">
            Showing {filteredData.length} of {matrix?.length || 0} SKUs
          </div>
        </div>

        {/* SKU Matrix Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU Code</th>
                  <th>Product Details</th>
                  <th>Velocity Rank</th>
                  <th>Margin</th>
                  <th>Availability</th>
                  <th>Return Rate</th>
                  <th>Health Score</th>
                  <th>Recommendation</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {matrixLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={9} className="text-center py-6 text-white/30 animate-pulse">
                        Loading SKU metrics and performance matrix...
                      </td>
                    </tr>
                  ))
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-white/30">
                      No SKUs match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item: any) => (
                    <tr key={item.sku_id}>
                      <td className="font-mono text-cyan-400 font-semibold text-xs">
                        {item.sku_code}
                      </td>
                      <td>
                        <div>
                          <p className="font-semibold text-white/90">{item.product_name}</p>
                          <p className="text-[10px] text-white/40 mt-0.5">{item.brand || "Generic"}</p>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">{item.velocity_rank_pct}%</span>
                          <span className="text-[10px] text-white/40">percentile</span>
                        </div>
                      </td>
                      <td className="font-medium">{item.gross_margin_pct}%</td>
                      <td>{item.availability_pct}%</td>
                      <td>{item.return_rate_pct}%</td>
                      <td>
                        <span className={`font-bold text-base ${getScoreColor(item.health_score)}`}>
                          {item.health_score}
                        </span>
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getBadgeClass(item.health_score)}`}>
                          {item.recommendation}
                        </span>
                      </td>
                      <td className="text-right">
                        {item.health_score < 25 ? (
                          <button 
                            className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all"
                            title="Initiate Delisting"
                            onClick={() => alert(`Delist approval request submitted for ${item.product_name}`)}
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <span className="text-[10px] text-white/30">Healthy</span>
                        )}
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
