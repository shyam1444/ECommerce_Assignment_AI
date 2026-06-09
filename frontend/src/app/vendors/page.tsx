"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { fetchVendors, fetchVendorScorecardSummary, draftVendorEmail, fetchVendorTrend } from "@/lib/api";
import { Users, Zap, Mail, RefreshCw, AlertTriangle } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";

const FLAG_STYLE: Record<string, string> = {
  GREEN: "text-green-400 bg-green-500/10 border-green-500/20",
  YELLOW: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  RED: "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function VendorsPage() {
  const [selectedVendor, setSelectedVendor] = useState<{id:string;vendor_name:string} | null>(null);
  const [emailIssue, setEmailIssue] = useState("DELIVERY_DELAY");
  const [emailDetails, setEmailDetails] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);

  const { data: vendors, isLoading } = useQuery({ queryKey: ["vendors"], queryFn: fetchVendors });
  const { data: scorecardSummary } = useQuery({ queryKey: ["vendor-scorecard-summary"], queryFn: fetchVendorScorecardSummary });
  const { data: vendorTrend } = useQuery({
    queryKey: ["vendor-trend", selectedVendor?.id],
    queryFn: () => selectedVendor ? fetchVendorTrend(selectedVendor.id) : null,
    enabled: !!selectedVendor,
  });

  async function handleDraftEmail() {
    if (!selectedVendor || !emailDetails) { toast.error("Select vendor and describe the issue"); return; }
    setLoadingEmail(true);
    try {
      const result = await draftVendorEmail(selectedVendor.id, emailIssue, emailDetails);
      setEmailDraft(result.email_draft);
    } catch {
      toast.error("AI email draft failed. Check API key.");
    }
    setLoadingEmail(false);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header px-8 py-6">
        <div>
          <h1 className="text-xl font-bold text-white">Vendor Management Copilot</h1>
          <p className="text-sm text-white/40 mt-0.5">Scorecards, performance trends, AI-drafted communications</p>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Scorecard Summary */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Vendors", value: scorecardSummary?.total_vendors || 0, color: "text-white" },
            { label: "Green (Healthy)", value: scorecardSummary?.green || 0, color: "text-green-400" },
            { label: "Yellow (Watch)", value: scorecardSummary?.yellow || 0, color: "text-amber-400" },
            { label: "Red (Action Needed)", value: scorecardSummary?.red || 0, color: "text-red-400" },
          ].map((k, i) => (
            <div key={i} className="glass-card p-5">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">{k.label}</p>
              <p className={clsx("text-2xl font-bold", k.color)}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Red vendors alert */}
        {(scorecardSummary?.vendors_needing_attention || []).length > 0 && (
          <div className="glass-card p-4 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-amber-400" />
              <p className="text-sm font-semibold text-amber-400">Vendors Needing Attention</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(scorecardSummary.vendors_needing_attention || []).map((v: {id:string;name:string;score:number;flag:string}) => (
                <div key={v.id} className={clsx("px-3 py-1.5 rounded-lg border text-xs font-medium", FLAG_STYLE[v.flag])}>
                  {v.name} — {v.score.toFixed(0)}/100
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-5 gap-5">
          {/* Vendor List */}
          <div className="col-span-2 glass-card p-5">
            <h2 className="text-sm font-semibold text-white mb-4">All Vendors</h2>
            {isLoading ? (
              <p className="text-white/30 text-sm">Loading…</p>
            ) : (
              <div className="space-y-2">
                {(vendors || []).map((v: {id:string;vendor_code:string;vendor_name:string;composite_score:number;flag:string;otif_pct:number;fill_rate_pct:number;lead_time_days:number}) => (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVendor(v)}
                    className={clsx(
                      "p-3 rounded-xl cursor-pointer transition-all border",
                      selectedVendor?.id === v.id
                        ? "bg-white/[0.08] border-white/20"
                        : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-white/80">{v.vendor_name}</p>
                      <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border font-semibold", FLAG_STYLE[v.flag])}>
                        {v.flag}
                      </span>
                    </div>
                    <div className="flex gap-3 text-[10px] text-white/40">
                      <span>Score: {v.composite_score.toFixed(0)}</span>
                      <span>OTIF: {v.otif_pct}%</span>
                      <span>Fill: {v.fill_rate_pct}%</span>
                      <span>LT: {v.lead_time_days}d</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="col-span-3 space-y-5">
            {selectedVendor ? (
              <>
                {/* Performance Trend */}
                <div className="glass-card p-5">
                  <h2 className="text-sm font-semibold text-white mb-3">{selectedVendor.vendor_name} — 12-Week Trend</h2>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={vendorTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="week" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} tickFormatter={d => d.slice(5)} />
                      <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} domain={[50, 100]} />
                      <Tooltip contentStyle={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                      <Line type="monotone" dataKey="composite" stroke="#00d4ff" strokeWidth={2} dot={false} name="Composite" />
                      <Line type="monotone" dataKey="otif" stroke="#7c3aed" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="OTIF" />
                      <Line type="monotone" dataKey="fill_rate" stroke="#10b981" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Fill Rate" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* AI Email Drafter */}
                <div className="glass-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap size={14} className="text-purple-400" />
                    <h2 className="text-sm font-semibold text-white">AI Vendor Email Drafter</h2>
                  </div>
                  <div className="space-y-3">
                    <select className="input-field" value={emailIssue} onChange={e => setEmailIssue(e.target.value)}>
                      <option value="DELIVERY_DELAY">Delivery Delay</option>
                      <option value="QUALITY_ISSUE">Quality Issue</option>
                      <option value="PRICE_MISMATCH">Price Mismatch</option>
                      <option value="SHORTAGE">Quantity Shortage</option>
                      <option value="GENERAL">General Escalation</option>
                    </select>
                    <textarea
                      className="input-field min-h-[80px] resize-none"
                      placeholder="Describe the specific issue… e.g. PO #123 was delivered 5 days late, we received only 80 bags vs 200 ordered."
                      value={emailDetails}
                      onChange={e => setEmailDetails(e.target.value)}
                    />
                    <button onClick={handleDraftEmail} disabled={loadingEmail} className="btn-primary flex items-center gap-2 w-full justify-center">
                      {loadingEmail ? <><RefreshCw size={12} className="animate-spin" /> Drafting with AI…</> : <><Zap size={12} /> Draft Email with Groq AI</>}
                    </button>
                    {emailDraft && (
                      <div className="ai-panel p-4 mt-2">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-white/40 font-semibold">AI-Generated Draft</p>
                          <button onClick={() => { navigator.clipboard.writeText(emailDraft); toast.success("Copied!"); }} className="text-[10px] text-cyan-400 hover:text-cyan-300">Copy</button>
                        </div>
                        <pre className="text-xs text-white/70 whitespace-pre-wrap leading-relaxed font-sans">{emailDraft}</pre>
                        <div className="flex gap-2 mt-3">
                          <button className="btn-success text-xs py-1.5 flex-1">✓ Send Email</button>
                          <button onClick={() => setEmailDraft("")} className="btn-ghost text-xs py-1.5">✕ Discard</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="glass-card p-8 flex items-center justify-center">
                <div className="text-center">
                  <Users size={32} className="text-white/20 mx-auto mb-3" />
                  <p className="text-sm text-white/30">Select a vendor to view performance trend and AI tools</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
