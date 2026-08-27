/**
 * Tantuve API client — all calls go through Vercel serverless functions at /api/*.
 */

import { API_BASE } from "./session";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tantuve-token");
}

async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = API_BASE ? `${API_BASE}${path}` : `/api${path}`;
  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw new Error("Unable to connect to the server. Please try again later.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: { id: string; email: string; full_name: string; role: string } }>(
      "/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
    ),
  me: () => apiFetch<{ user_id: string; role: string }>("/me"),
};

export interface WeaverProduct {
  id: string;
  title: string;
  craft_type: string;
  status: string;
  lot_id?: string;
  yarn_source?: string;
  createdAt: string;
  updatedAt: string;
  ledger_entries?: Array<{
    step_name: string;
    step_data: Record<string, any>;
    actor: string;
    timestamp: string;
    photo_base64?: string;
  }>;
}

interface AppendStepResponse {
  success: boolean;
  entryId: string;
}

interface CompleteProductResponse {
  success: boolean;
  ipfsCid: string;
}

export const weaverApi = {
  products: () => apiFetch<WeaverProduct[]>("/weaver/products"),
  createProduct: (data: { title: string; craft_type: string; yarn_source?: string; lot_id?: string }) =>
    apiFetch<{ productId: string }>("/weaver/products", { method: "POST", body: JSON.stringify(data) }),
  getProduct: (id: string) => apiFetch<WeaverProduct>(`/weaver/products/${id}`),
  appendStep: (productId: string, data: { step_name: string; step_data?: Record<string, string>; actor?: string; photo_base64?: string }) =>
    apiFetch<AppendStepResponse>(`/weaver/products/${productId}/steps`, { method: "POST", body: JSON.stringify(data) }),
  complete: (productId: string) =>
    apiFetch<CompleteProductResponse>(`/weaver/products/${productId}/complete`, { method: "POST" }),
  earnings: () => apiFetch<any>("/weaver/earnings"),
  qrUrl: (productId: string) => API_BASE ? `${API_BASE}/weaver/products/${productId}/qr` : `/api/weaver/products/${productId}/qr`,
};

export interface AdminDashboard {
  totalWeavers: number;
  pendingWeavers: number;
  totalProducts: number;
  openDisputes: number;
}

export interface Weaver {
  id: string;
  name: string;
  craft_type: string;
  region: string;
  gi_registered: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  title: string;
  craft_type: string;
  status: string;
  weaver_id: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegistryItem {
  id: string;
  craft_type: string;
  region: string;
  official_description: string;
}

interface Dispute {
  id: string;
  product_id: string;
  reason: string;
  status: string;
  // Add other fields as needed
}

interface FlaggedEntry {
  id: string;
  product_id: string;
  seq: number;
  step_name: string;
  flagged_reason: string;
  // Add other fields as needed
}

interface SpotCheck {
  id: string;
  title: string;
  craft_type: string;
  spot_check_status: string;
  // Add other fields as needed
}

interface WhitelistItem {
  id: string;
  identifier: string;
  requested_role: string;
  status: string;
  // Add other fields as needed
}

export interface Retailer {
  id: string;
  business_name: string;
  name?: string;
  location: string;
  request_status: string;
  user_id?: string;
  // Add other fields as needed
}

export const adminApi = {
  dashboard: () => apiFetch<AdminDashboard>("/admin/dashboard"),
  weavers: (status?: string) => apiFetch<Weaver[]>(`/admin/weavers${status ? `?status=${status}` : ""}`),
  approveWeaver: (id: string) => apiFetch<{ success: boolean }>(`/admin/weavers/${id}/approve`, { method: "POST" }),
  rejectWeaver: (id: string) => apiFetch<{ success: boolean }>(`/admin/weavers/${id}/reject`, { method: "POST" }),
  products: () => apiFetch<Product[]>("/admin/products"),
  registry: () => apiFetch<RegistryItem[]>("/admin/registry"),
  addRegistry: (data: { craft_type: string; region: string; official_description: string }) =>
    apiFetch<{ success: boolean }>("/admin/registry", { method: "POST", body: JSON.stringify(data) }),
  disputes: () => apiFetch<Dispute[]>("/admin/disputes"),
  resolveDispute: (id: string, status: string) =>
    apiFetch<{ success: boolean }>(`/admin/disputes/${id}/resolve`, { method: "POST", body: JSON.stringify({ status }) }),
  analytics: () => apiFetch<any>("/admin/analytics"), // Keeping any for complex analytics data
  flagged: () => apiFetch<FlaggedEntry[]>("/admin/flagged"),
  reviewFlagged: (entryId: string, action: string) =>
    apiFetch<{ success: boolean }>(`/admin/flagged/${entryId}/review`, { method: "POST", body: JSON.stringify({ action }) }),
  spotChecks: () => apiFetch<SpotCheck[]>("/admin/spot-checks"),
  reviewSpotCheck: (productId: string, action: string) =>
    apiFetch<{ success: boolean }>(`/admin/spot-checks/${productId}/review`, { method: "POST", body: JSON.stringify({ action }) }),
  whitelist: (status?: string, role?: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (role) params.set("role", role);
    const qs = params.toString();
    return apiFetch<WhitelistItem[]>("/admin/whitelist" + (qs ? "?" + qs : ""));
  },
  createWhitelist: (data: { identifier: string; requested_role: string; applicant_name?: string; applicant_location?: string; applicant_craft?: string; review_note?: string }) =>
    apiFetch<{ success: boolean }>("/admin/whitelist", { method: "POST", body: JSON.stringify(data) }),
  approveWhitelist: (id: string, note?: string) =>
    apiFetch<{ success: boolean }>("/admin/whitelist/" + id + "/approve", { method: "POST", body: JSON.stringify({ review_note: note }) }),
  rejectWhitelist: (id: string, note: string) =>
    apiFetch<{ success: boolean }>("/admin/whitelist/" + id + "/reject", { method: "POST", body: JSON.stringify({ review_note: note }) }),
  revokeWhitelist: (id: string, note: string) =>
    apiFetch<{ success: boolean }>("/admin/whitelist/" + id + "/revoke", { method: "POST", body: JSON.stringify({ review_note: note }) }),
  auditWhitelist: (id: string) =>
    apiFetch<any[]>(`/admin/whitelist/${id}/audit`), // Keeping any for audit complexity
  bulkWhitelist: (ids: string[], action: "approve" | "reject", note?: string) =>
    apiFetch<{ success: boolean }>("/admin/whitelist/bulk", { method: "POST", body: JSON.stringify({ ids, action, review_note: note }) }),
  retailers: (status?: string) => apiFetch<Retailer[]>(`/admin/retailers${status ? `?status=${status}` : ""}`),
  approveRetailer: (id: string) => apiFetch<{ success: boolean }>(`/admin/retailers/${id}/approve`, { method: "POST" }),
  rejectRetailer: (id: string) => apiFetch<{ success: boolean }>(`/admin/retailers/${id}/reject`, { method: "POST" }),
  riskScores: () => apiFetch<any[]>("/admin/risk-scores"),
  scanAnomalies: () => apiFetch<any[]>("/admin/scan-anomalies"),
  scanHistory: (productId: string) => apiFetch<{ scans: any[]; stats: any }>(`/admin/scan-history?product_id=${productId}`),
  customFields: {
    list: () => apiFetch<any[]>("/admin/registry/custom-fields"),
    update: (craft_type: string, custom_fields: any[]) =>
      apiFetch<{ success: boolean }>("/admin/registry/custom-fields", {
        method: "POST",
        body: JSON.stringify({ craft_type, custom_fields }),
      }),
  },
};

export const retailerApi = {
  receive: (productId: string) =>
    apiFetch<any>("/retailer/receive", { method: "POST", body: JSON.stringify({ product_id: productId }) }),
  inventory: () => apiFetch<any[]>("/retailer/inventory"),
  listForSale: (productId: string, price: number | null, listed: boolean) =>
    apiFetch<any>("/retailer/list-for-sale", {
      method: "POST",
      body: JSON.stringify({ product_id: productId, price, listed }),
    }),
};

export const publicApi = {
  verify: (productId: string) => apiFetch<any>(`/verify/${productId}`),
  report: (productId: string, reason: string, contact?: string) =>
    apiFetch<any>("/disputes", {
      method: "POST",
      body: JSON.stringify({ product_id: productId, reason, reporter_contact: contact }),
    }),
  explore: () => apiFetch<any[]>("/explore"),
  marketplace: () => apiFetch<any[]>("/marketplace"),
  giRegistry: () => apiFetch<any[]>("/gi-registry"),
  stats: () => apiFetch<{ products: number; weavers: number; verifications: number }>("/stats"),
  applyRetailer: (data: { email: string; password: string; business_name: string; location: string; contact_email?: string }) =>
    apiFetch<any>("/apply-retailer", { method: "POST", body: JSON.stringify(data) }),
  mapData: () => apiFetch<any[]>("/map-data"),
  weaversLeaderboard: () => apiFetch<{ weavers: any[]; spotlight: any; totalWeavers: number }>("/weavers-leaderboard"),
  smsSimulator: (data: { phone: string; message: string }) =>
    apiFetch<any>("/sms-simulator", { method: "POST", body: JSON.stringify(data) }),
};
