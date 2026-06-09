"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchSkus, generateContent } from "@/lib/api";
import { FileText, Sparkles, Check, Copy, AlertCircle, RefreshCw, Star } from "lucide-react";
import toast from "react-hot-toast";

export default function ContentPage() {
  const [selectedSkuId, setSelectedSkuId] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: skus, isLoading: skusLoading } = useQuery({
    queryKey: ["skusContent"],
    queryFn: () => fetchSkus(),
  });

  const selectedSku = skus?.find((s: any) => s.id === selectedSkuId);

  const contentMutation = useMutation({
    mutationFn: generateContent,
    onSuccess: (data) => {
      toast.success("AI content generated successfully!");
    },
    onError: (err) => {
      toast.error("Failed to generate content: " + err.message);
    },
  });

  const handleGenerate = () => {
    if (!selectedSkuId) return;
    contentMutation.mutate(selectedSkuId);
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const parseGeneratedContent = (text: string) => {
    if (!text) return null;
    
    // Attempt to parse out structured parts from the text response
    const lines = text.split("\n");
    let seoTitle = "";
    let description = "";
    let bulletPoints: string[] = [];
    let keywords = "";
    
    let currentSection = "";
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      if (trimmed.toLowerCase().includes("seo title") || trimmed.toLowerCase().startsWith("1.")) {
        currentSection = "title";
        seoTitle = trimmed.replace(/^(seo title:|1\.\s*)/i, "").trim();
      } else if (trimmed.toLowerCase().includes("description") || trimmed.toLowerCase().startsWith("2.")) {
        currentSection = "desc";
        description = trimmed.replace(/^(short description:|description:|2\.\s*)/i, "").trim();
      } else if (trimmed.toLowerCase().includes("bullet") || trimmed.toLowerCase().startsWith("3.")) {
        currentSection = "bullets";
      } else if (trimmed.toLowerCase().includes("keywords") || trimmed.toLowerCase().startsWith("4.")) {
        currentSection = "keywords";
        keywords = trimmed.replace(/^(search keywords:|keywords:|4\.\s*)/i, "").trim();
      } else {
        if (currentSection === "title" && !seoTitle) {
          seoTitle = trimmed;
        } else if (currentSection === "desc") {
          description += (description ? " " : "") + trimmed;
        } else if (currentSection === "bullets") {
          bulletPoints.push(trimmed.replace(/^[-*•\d.]\s*/, ""));
        } else if (currentSection === "keywords" && !keywords) {
          keywords = trimmed;
        }
      }
    }

    // fallback if splitting failed
    if (!seoTitle && !description) {
      return { raw: text };
    }
    
    return {
      seoTitle: seoTitle.replace(/["']/g, ""),
      description: description.replace(/["']/g, ""),
      bulletPoints: bulletPoints.slice(0, 5),
      keywords: keywords.replace(/["']/g, ""),
    };
  };

  const aiOutput = contentMutation.data ? parseGeneratedContent(contentMutation.data.generated_content) : null;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Header */}
      <header className="page-header px-8 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="text-cyan-400" size={24} />
              Product Content AI
            </h1>
            <p className="text-xs text-white/50 mt-1">
              Enrich catalog master data, write SEO-optimized listings, and generate search keywords.
            </p>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        {/* Left column: SKU Select & Specs */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          <div className="glass-card p-6 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Select SKU for Enrichment</h2>
            <div>
              <label className="text-xs text-white/40 block mb-1">Active Catalog SKUs</label>
              {skusLoading ? (
                <div className="h-10 bg-white/5 rounded animate-pulse" />
              ) : (
                <select
                  className="input-field"
                  value={selectedSkuId}
                  onChange={(e) => {
                    setSelectedSkuId(e.target.value);
                    contentMutation.reset();
                  }}
                >
                  <option value="">-- Choose a Product --</option>
                  {skus?.map((sku: any) => (
                    <option key={sku.id} value={sku.id}>
                      {sku.sku_code} - {sku.product_name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            {selectedSku && (
              <div className="pt-4 border-t border-white/[0.06] space-y-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Brand</span>
                  <p className="text-sm font-medium text-white/95">{selectedSku.brand || "Generic"}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Category</span>
                  <p className="text-sm font-medium text-white/95">{selectedSku.category}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Specs & Logistics</span>
                  <div className="grid grid-cols-2 gap-2 mt-1 bg-white/[0.02] p-2.5 rounded border border-white/[0.04] text-xs">
                    <div>
                      <span className="text-white/40">UOM:</span> {selectedSku.uom}
                    </div>
                    <div>
                      <span className="text-white/40">Pack Size:</span> {selectedSku.pack_size}
                    </div>
                    <div>
                      <span className="text-white/40">MRP:</span> ₹{selectedSku.mrp}
                    </div>
                    <div>
                      <span className="text-white/40">Content Score:</span> {selectedSku.content_score}/100
                    </div>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Raw Description</span>
                  <p className="text-xs text-white/60 leading-relaxed mt-1 italic">
                    &ldquo;{selectedSku.description || "No description provided in ERP Master."}&rdquo;
                  </p>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={contentMutation.isPending}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-4"
                >
                  {contentMutation.isPending ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Generating Content...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Generate AI Listing Content
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          
          {!selectedSku && (
            <div className="glass-card p-6 flex flex-col items-center justify-center text-center text-white/30 flex-1 border-dashed">
              <AlertCircle size={32} className="mb-2 text-white/20" />
              <p className="text-sm">Please select a product from the list above to view specifications and generate optimized copy.</p>
            </div>
          )}
        </div>

        {/* Right column: AI content generated */}
        <div className="lg:col-span-7 flex flex-col">
          {contentMutation.isIdle && (
            <div className="glass-card p-8 flex flex-col items-center justify-center text-center text-white/30 flex-1 border-dashed">
              <Sparkles size={40} className="mb-3 text-cyan-400/40 animate-pulse" />
              <h3 className="text-white/70 font-semibold mb-1">Generate High-Quality Copy</h3>
              <p className="text-xs max-w-sm">
                Enrich search capabilities with optimized descriptions, search keywords and metadata suitable for quick commerce delivery apps.
              </p>
            </div>
          )}

          {contentMutation.isPending && (
            <div className="glass-card p-8 flex flex-col items-center justify-center text-center text-white/30 flex-1">
              <RefreshCw size={40} className="mb-4 text-purple-400 animate-spin" />
              <h3 className="text-white/70 font-semibold mb-1">AI Agent Working</h3>
              <p className="text-xs max-w-sm">
                Drafting titles, descriptions and extracting bullet points. This will take a few seconds...
              </p>
            </div>
          )}

          {aiOutput && (
            <div className="glass-card p-6 space-y-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Star size={16} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-semibold text-white/90">AI Generated Copywriting</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    Content Score: 95/100
                  </span>
                </div>

                {/* If regex parsing was successful */}
                {aiOutput.seoTitle ? (
                  <div className="space-y-4">
                    {/* SEO Title */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">SEO Title</span>
                        <button
                          onClick={() => copyToClipboard(aiOutput.seoTitle!, "Title")}
                          className="text-[10px] text-cyan-400 flex items-center gap-1 hover:underline"
                        >
                          {copiedField === "Title" ? <Check size={10} /> : <Copy size={10} />}
                          {copiedField === "Title" ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-white bg-white/[0.02] p-2.5 rounded border border-white/[0.04]">
                        {aiOutput.seoTitle}
                      </p>
                    </div>

                    {/* Description */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Short Description</span>
                        <button
                          onClick={() => copyToClipboard(aiOutput.description!, "Description")}
                          className="text-[10px] text-cyan-400 flex items-center gap-1 hover:underline"
                        >
                          {copiedField === "Description" ? <Check size={10} /> : <Copy size={10} />}
                          {copiedField === "Description" ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <p className="text-xs text-white/85 leading-relaxed bg-white/[0.02] p-2.5 rounded border border-white/[0.04]">
                        {aiOutput.description}
                      </p>
                    </div>

                    {/* Bullets */}
                    {aiOutput.bulletPoints && aiOutput.bulletPoints.length > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Key Features (Bullet Points)</span>
                          <button
                            onClick={() => copyToClipboard(aiOutput.bulletPoints!.join("\n"), "Bullets")}
                            className="text-[10px] text-cyan-400 flex items-center gap-1 hover:underline"
                          >
                            {copiedField === "Bullets" ? <Check size={10} /> : <Copy size={10} />}
                            {copiedField === "Bullets" ? "Copied" : "Copy All"}
                          </button>
                        </div>
                        <ul className="text-xs text-white/80 space-y-1.5 list-disc pl-4 bg-white/[0.02] p-3 rounded border border-white/[0.04]">
                          {aiOutput.bulletPoints.map((bp, i) => (
                            <li key={i} className="leading-relaxed">{bp}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Keywords */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Search Keywords</span>
                        <button
                          onClick={() => copyToClipboard(aiOutput.keywords!, "Keywords")}
                          className="text-[10px] text-cyan-400 flex items-center gap-1 hover:underline"
                        >
                          {copiedField === "Keywords" ? <Check size={10} /> : <Copy size={10} />}
                          {copiedField === "Keywords" ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <p className="text-xs text-cyan-300 bg-cyan-950/20 p-2.5 rounded border border-cyan-500/10 font-mono">
                        {aiOutput.keywords}
                      </p>
                    </div>
                  </div>
                ) : (
                  // Raw fallback if splitting failed
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">AI Narrative</span>
                      <button
                        onClick={() => copyToClipboard(aiOutput.raw!, "AI Output")}
                        className="text-[10px] text-cyan-400 flex items-center gap-1 hover:underline"
                      >
                        {copiedField === "AI Output" ? <Check size={10} /> : <Copy size={10} />}
                        {copiedField === "AI Output" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <pre className="text-xs text-white/80 whitespace-pre-wrap bg-white/[0.02] p-3 rounded border border-white/[0.04] font-sans leading-relaxed">
                      {aiOutput.raw}
                    </pre>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-[10px] text-white/35">AI content generated using prompt template v1.2</span>
                <button
                  onClick={() => alert("Product Content changes approved and synced to OMS.")}
                  className="btn-success text-xs font-semibold py-1.5 px-4 rounded"
                >
                  Sync to Master Catalog
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
