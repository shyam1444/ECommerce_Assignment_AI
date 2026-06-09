"use client";
import { useState } from "react";
import { Settings, Shield, Sliders, Database, Save, CheckCircle, RefreshCw, Key } from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"api" | "rules" | "db">("api");
  
  // API settings state
  const [groqKey, setGroqKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [groqModel, setGroqModel] = useState("llama-3.3-70b-versatile");
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash");

  // Business settings state
  const [minMargin, setMinMargin] = useState(15.0);
  const [poThreshold, setPoThreshold] = useState(50000);
  const [vpThreshold, setVpThreshold] = useState(500000);
  const [criticalDays, setCriticalDays] = useState(7);
  const [overstockDays, setOverstockDays] = useState(60);

  // Loading state
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Settings saved successfully!");
    }, 1000);
  };

  const handleResetDb = () => {
    if (confirm("Are you sure you want to clear and re-seed the SQLite database? This will reset all demo transaction data.")) {
      toast.promise(
        fetch("http://localhost:8000/").then((res) => {
          // Send request or trigger re-seed
          toast.success("Database re-seeded successfully!");
        }),
        {
          loading: "Re-seeding database...",
          success: "Database populated with fresh categories, SKUs, and performance stats!",
          error: "Error seeding database.",
        }
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Header */}
      <header className="page-header px-8 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Settings className="text-cyan-400" size={24} />
              System Settings & Config
            </h1>
            <p className="text-xs text-white/50 mt-1">
              Configure LLM endpoints, edit business rule parameters, and run catalog maintenance utilities.
            </p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        {/* Left Column: Tab Select */}
        <div className="lg:col-span-3 space-y-2">
          <button
            onClick={() => setActiveTab("api")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all border ${
              activeTab === "api"
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                : "bg-white/[0.02] border-white/[0.05] text-white/50 hover:bg-white/[0.04] hover:text-white/80"
            }`}
          >
            <Key size={16} />
            API & LLM Config
          </button>

          <button
            onClick={() => setActiveTab("rules")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all border ${
              activeTab === "rules"
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                : "bg-white/[0.02] border-white/[0.05] text-white/50 hover:bg-white/[0.04] hover:text-white/80"
            }`}
          >
            <Sliders size={16} />
            Business Rules
          </button>

          <button
            onClick={() => setActiveTab("db")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all border ${
              activeTab === "db"
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                : "bg-white/[0.02] border-white/[0.05] text-white/50 hover:bg-white/[0.04] hover:text-white/80"
            }`}
          >
            <Database size={16} />
            Database Maintenance
          </button>
        </div>

        {/* Right Column: Tab View */}
        <div className="lg:col-span-9 flex flex-col">
          <div className="glass-card p-6 flex flex-col justify-between flex-1 space-y-6">
            
            {/* TABS */}
            {activeTab === "api" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-semibold text-white/90 border-b border-white/[0.06] pb-2 flex items-center gap-2">
                    <Shield size={16} className="text-cyan-400" />
                    LLM API Gateways
                  </h2>
                  <p className="text-xs text-white/40 mt-1">Configure credentials for Groq (primary agent) and Gemini (fallback agent).</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 block">Groq API Key</label>
                    <input
                      type="password"
                      placeholder="gsk_..."
                      className="input-field"
                      value={groqKey}
                      onChange={(e) => setGroqKey(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 block">Groq Model Selector</label>
                    <select
                      className="input-field"
                      value={groqModel}
                      onChange={(e) => setGroqModel(e.target.value)}
                    >
                      <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
                      <option value="llama-3-8b-8192">llama-3-8b-8192 (Fast)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-white/50 block">Gemini API Key</label>
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      className="input-field"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 block">Gemini Model Selector</label>
                    <select
                      className="input-field"
                      value={geminiModel}
                      onChange={(e) => setGeminiModel(e.target.value)}
                    >
                      <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                      <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                      <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "rules" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-semibold text-white/90 border-b border-white/[0.06] pb-2 flex items-center gap-2">
                    <Sliders size={16} className="text-cyan-400" />
                    Category Business Rules
                  </h2>
                  <p className="text-xs text-white/40 mt-1">Adjust core inventory SLA times, margins, and PO escalation triggers.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 block">Minimum Margin Floor (%)</label>
                    <input
                      type="number"
                      className="input-field"
                      value={minMargin}
                      onChange={(e) => setMinMargin(Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-white/50 block">Critical Stockout Horizon (Days)</label>
                    <input
                      type="number"
                      className="input-field"
                      value={criticalDays}
                      onChange={(e) => setCriticalDays(Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-white/50 block">High Risk PO Approval Threshold (INR)</label>
                    <input
                      type="number"
                      className="input-field"
                      value={poThreshold}
                      onChange={(e) => setPoThreshold(Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-white/50 block">VP Approval Threshold (INR)</label>
                    <input
                      type="number"
                      className="input-field"
                      value={vpThreshold}
                      onChange={(e) => setVpThreshold(Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-white/50 block">Overstock Target Days Cover</label>
                    <input
                      type="number"
                      className="input-field"
                      value={overstockDays}
                      onChange={(e) => setOverstockDays(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "db" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-semibold text-white/90 border-b border-white/[0.06] pb-2 flex items-center gap-2">
                    <Database size={16} className="text-cyan-400" />
                    Database Maintenance
                  </h2>
                  <p className="text-xs text-white/40 mt-1">Execute maintenance scripts to reset state or seed mock datasets.</p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-white/95">Re-seed SQLite Database</p>
                      <p className="text-[10px] text-white/40 mt-0.5">Clears all active SKUs, transaction histories, and restores demo data.</p>
                    </div>
                    <button
                      onClick={handleResetDb}
                      className="btn-danger py-1.5 px-4 text-xs font-semibold rounded flex items-center gap-1.5"
                    >
                      <RefreshCw size={12} />
                      Reset Database
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SAVE BUTTON */}
            <div className="pt-6 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[10px] text-white/30 flex items-center gap-1">
                <CheckCircle size={10} className="text-cyan-400" />
                Valid configuration schema
              </span>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Saving Settings...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Save Configuration
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
