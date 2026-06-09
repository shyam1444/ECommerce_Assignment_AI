import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// ─── COCKPIT / REPORTS ─────────────────────────────────
export const fetchCockpit = () => api.get("/reports/cockpit").then(r => r.data);
export const fetchGmvTrend = (days = 30) => api.get(`/reports/gmv-trend?days=${days}`).then(r => r.data);
export const fetchCategoryPerformance = (days = 30) => api.get(`/reports/category-performance?days=${days}`).then(r => r.data);
export const fetchDailyReview = () => api.get("/reports/daily-business-review").then(r => r.data);

// ─── INVENTORY ──────────────────────────────────────────
export const fetchInventoryAlerts = () => api.get("/inventory/alerts").then(r => r.data);
export const fetchInventorySummary = () => api.get("/inventory/summary").then(r => r.data);
export const fetchStockLevels = (hubId?: string) =>
  api.get(`/inventory/stock-levels${hubId ? `?hub_id=${hubId}` : ""}`).then(r => r.data);
export const fetchHubs = () => api.get("/inventory/hubs").then(r => r.data);
export const fetchPoRecommendation = (skuId: string, hubId: string) =>
  api.get(`/inventory/po-recommendation/${skuId}/${hubId}`).then(r => r.data);
export const fetchVelocityTrend = (skuId: string, days = 30) =>
  api.get(`/inventory/velocity-trend/${skuId}?days=${days}`).then(r => r.data);

// ─── VENDORS ────────────────────────────────────────────
export const fetchVendors = () => api.get("/vendors/").then(r => r.data);
export const fetchVendor = (id: string) => api.get(`/vendors/${id}`).then(r => r.data);
export const fetchVendorScorecardSummary = () => api.get("/vendors/scorecards/summary").then(r => r.data);
export const fetchVendorTrend = (id: string) => api.get(`/vendors/performance/trend/${id}`).then(r => r.data);
export const draftVendorEmail = (vendorId: string, issueType: string, details: string) =>
  api.post("/vendors/draft-email", { vendor_id: vendorId, issue_type: issueType, details }).then(r => r.data);

// ─── PRICING ────────────────────────────────────────────
export const fetchPricingDashboard = () => api.get("/pricing/dashboard").then(r => r.data);
export const fetchMarginSummary = () => api.get("/pricing/margin-summary").then(r => r.data);
export const fetchCompetitiveGap = () => api.get("/pricing/competitive-gap").then(r => r.data);
export const suggestPrice = (skuId: string, hubId?: string) =>
  api.post("/pricing/suggest", { sku_id: skuId, hub_id: hubId }).then(r => r.data);
export const updatePrice = (data: { sku_id: string; hub_id: string; new_selling_price: number; reason: string }) =>
  api.post("/pricing/update", data).then(r => r.data);

// ─── SKUs ───────────────────────────────────────────────
export const fetchSkus = (categoryId?: string) =>
  api.get(`/skus/${categoryId ? `?category_id=${categoryId}` : ""}`).then(r => r.data);
export const fetchSkuHealthMatrix = () => api.get("/skus/health-matrix").then(r => r.data);
export const fetchCategories = () => api.get("/skus/categories").then(r => r.data);
export const fetchAssortmentInsight = () => api.get("/skus/assortment-insight").then(r => r.data);
export const generateContent = (skuId: string) =>
  api.post("/skus/generate-content", { sku_id: skuId }).then(r => r.data);

// ─── APPROVALS ──────────────────────────────────────────
export const fetchApprovals = (status = "PENDING") =>
  api.get(`/approvals/?status=${status}`).then(r => r.data);
export const fetchApprovalSummary = () => api.get("/approvals/summary").then(r => r.data);
export const approveRequest = (id: string, comment?: string) =>
  api.post(`/approvals/${id}/approve`, { comment }).then(r => r.data);
export const rejectRequest = (id: string, comment: string) =>
  api.post(`/approvals/${id}/reject`, { comment }).then(r => r.data);
export const fetchAuditLog = () => api.get("/approvals/audit-log").then(r => r.data);
