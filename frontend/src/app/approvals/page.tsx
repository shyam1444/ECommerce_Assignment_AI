"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApprovals, fetchApprovalSummary, approveRequest, rejectRequest, fetchAuditLog } from "@/lib/api";
import { CheckSquare, ShieldAlert, Clock, Check, X, FileSearch, HelpCircle, History, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [comment, setComment] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  
  const queryClient = useQueryClient();

  const { data: approvals, isLoading: approvalsLoading } = useQuery({
    queryKey: ["approvals", activeTab],
    queryFn: () => fetchApprovals(activeTab),
  });

  const { data: summary } = useQuery({
    queryKey: ["approvalSummary"],
    queryFn: fetchApprovalSummary,
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ["auditLogs"],
    queryFn: fetchAuditLog,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) => approveRequest(id, comment),
    onSuccess: () => {
      toast.success("Request approved successfully");
      setSelectedRequestId(null);
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["approvalSummary"] });
      queryClient.invalidateQueries({ queryKey: ["auditLogs"] });
    },
    onError: (err) => {
      toast.error("Error: " + err.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => rejectRequest(id, comment),
    onSuccess: () => {
      toast.success("Request rejected");
      setSelectedRequestId(null);
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["approvalSummary"] });
      queryClient.invalidateQueries({ queryKey: ["auditLogs"] });
    },
    onError: (err) => {
      toast.error("Error: " + err.message);
    },
  });

  const handleApprove = (id: string) => {
    approveMutation.mutate({ id, comment: comment || undefined });
  };

  const handleReject = (id: string) => {
    if (!comment) {
      toast.error("Rejection requires a comment/reason!");
      return;
    }
    rejectMutation.mutate({ id, comment });
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return "text-red-400";
    if (score >= 45) return "text-amber-400";
    return "text-emerald-400";
  };

  const selectedRequest = approvals?.find((a: any) => a.id === selectedRequestId);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Header */}
      <header className="page-header px-8 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <CheckSquare className="text-cyan-400" size={24} />
              Task & Approval Workflow
            </h1>
            <p className="text-xs text-white/50 mt-1">
              Enforce margin guardrails, purchase order approvals, and dynamic price verification with AI risk indexing.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-white/40">Approved today:</span>
              <span className="font-bold text-emerald-400">{summary?.approved_today || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/40">High Risk Pending:</span>
              <span className="font-bold text-red-400">{summary?.high_risk_pending || 0}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        {/* Left Side: Inbox and list */}
        <div className="lg:col-span-7 space-y-6 flex flex-col">
          {/* Tab Selection */}
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-1">
            <div className="flex gap-4">
              {["PENDING", "APPROVED", "REJECTED"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab as any);
                    setSelectedRequestId(null);
                  }}
                  className={`pb-3 text-sm font-semibold transition-all relative ${
                    activeTab === tab
                      ? "text-cyan-400"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {tab}
                  {tab === "PENDING" && summary?.pending_count ? (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-cyan-400/10 border border-cyan-400/25 rounded-full text-cyan-400 font-bold">
                      {summary.pending_count}
                    </span>
                  ) : null}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* List Area */}
          <div className="space-y-4 overflow-y-auto flex-1 max-h-[500px] pr-2">
            {approvalsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-card p-5 animate-pulse h-28" />
              ))
            ) : !approvals || approvals.length === 0 ? (
              <div className="glass-card p-8 text-center text-white/30 italic">
                No approval requests found in this folder.
              </div>
            ) : (
              approvals.map((req: any) => (
                <div
                  key={req.id}
                  onClick={() => setSelectedRequestId(req.id)}
                  className={`glass-card p-5 transition-all cursor-pointer relative hover:border-white/20 ${
                    selectedRequestId === req.id
                      ? "border-cyan-400 bg-cyan-500/[0.02] shadow-lg shadow-cyan-500/5"
                      : ""
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded tracking-wider">
                          {req.request_type}
                        </span>
                        <span className="text-xs text-white/40 flex items-center gap-1">
                          <Clock size={12} />
                          {req.created_at ? new Date(req.created_at).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white/90 mt-2">
                        {req.reference_label}
                      </h3>
                      <p className="text-xs text-white/40 mt-1">
                        Requested by: <span className="text-white/60">{req.requested_by}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <ShieldAlert size={14} className={getRiskColor(req.ai_risk_score)} />
                        <span className={`text-xs font-bold ${getRiskColor(req.ai_risk_score)}`}>
                          AI Risk: {req.ai_risk_score}%
                        </span>
                      </div>
                      <span className="text-[10px] text-white/30 block mt-1">SLA 4 hrs</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Audit logs panel */}
          <div className="glass-card p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
              <History size={14} />
              Recent System Audit Logs (Append-Only)
            </h3>
            <div className="text-xs space-y-2 max-h-40 overflow-y-auto pr-2">
              {auditLoading ? (
                <div className="text-white/20 animate-pulse">Loading logs...</div>
              ) : !auditLogs || auditLogs.length === 0 ? (
                <div className="text-white/20 italic">No audit records found.</div>
              ) : (
                auditLogs.map((log: any) => (
                  <div key={log.id} className="flex justify-between items-center bg-white/[0.01] p-2 rounded border border-white/[0.03]">
                    <div className="space-y-0.5">
                      <p className="text-white/80">
                        <span className="font-semibold text-cyan-400">{log.actor_name}</span> executed{" "}
                        <span className="font-semibold">{log.action}</span> on {log.table_name}
                      </p>
                      <p className="text-[10px] text-white/30">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : ""}
                      </p>
                    </div>
                    {log.action === "APPROVE" ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : (
                      <X size={14} className="text-red-400" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Request Details & Verification Panel */}
        <div className="lg:col-span-5 flex flex-col">
          {!selectedRequest ? (
            <div className="glass-card p-8 flex flex-col items-center justify-center text-center text-white/30 flex-1 border-dashed">
              <FileSearch size={40} className="mb-3 text-white/20" />
              <h3 className="text-white/70 font-semibold mb-1">Select approval request</h3>
              <p className="text-xs max-w-xs">
                Select any request from the list to view target margin calculations, AI assessment data, and finalize actions.
              </p>
            </div>
          ) : (
            <div className="glass-card p-6 flex flex-col justify-between flex-1 space-y-6">
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <h3 className="text-sm font-semibold text-white/95 flex items-center gap-1.5">
                    <MessageSquare size={16} className="text-cyan-400" />
                    Verification Advisory
                  </h3>
                  <span className={`px-2 py-0.5 text-[10px] rounded font-bold uppercase ${
                    selectedRequest.ai_risk_score >= 70 ? "badge-critical" : "badge-warning"
                  }`}>
                    {selectedRequest.ai_risk_score >= 70 ? "High Risk Alert" : "Medium Risk"}
                  </span>
                </div>

                {/* Info summary */}
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Item Label</span>
                    <p className="text-sm font-medium text-white">{selectedRequest.reference_label}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Requester</span>
                    <p className="text-sm text-white/80">{selectedRequest.requested_by}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-white/30 tracking-wider">AI Recommendation Rationale</span>
                    <p className="text-xs text-white/80 leading-relaxed bg-purple-500/5 border border-purple-500/10 p-3 rounded">
                      {selectedRequest.ai_recommendation || "Analyzing risk bounds..."}
                    </p>
                  </div>
                </div>

                {/* Action input comment */}
                {activeTab === "PENDING" && (
                  <div className="space-y-2 pt-2">
                    <label className="text-xs text-white/40 block">Comment / Rejection Reason</label>
                    <textarea
                      placeholder="Explain logic for approval or specify rejection reason..."
                      className="input-field min-h-24 text-xs py-2"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {activeTab === "PENDING" ? (
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/[0.06]">
                  <button
                    onClick={() => handleReject(selectedRequest.id)}
                    className="btn-danger w-full flex items-center justify-center gap-1.5"
                    disabled={rejectMutation.isPending || approveMutation.isPending}
                  >
                    <X size={14} />
                    Reject Request
                  </button>
                  <button
                    onClick={() => handleApprove(selectedRequest.id)}
                    className="btn-success w-full flex items-center justify-center gap-1.5"
                    disabled={rejectMutation.isPending || approveMutation.isPending}
                  >
                    <Check size={14} />
                    Approve
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-white/[0.06] text-center text-xs text-white/30">
                  This request has been <span className="font-semibold text-white/60">{selectedRequest.status}</span>. No further action is required.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
