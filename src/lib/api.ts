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

export const weaverApi = {
  products: () => apiFetch<any[]>("/weaver/products"),
  createProduct: (data: { title: string; craft_type: string; yarn_source?: string; lot_id?: string }) =>
    apiFetch<{ productId: string }>("/weaver/products", { method: "POST", body: JSON.stringify(data) }),
  getProduct: (id: string) => apiFetch<any>(`/weaver/products/${id}`),
  appendStep: (productId: string, data: { step_name: string; step_data?: Record<string, string>; actor?: string; photo_base64?: string }) =>
    apiFetch<any>(`/weaver/products/${productId}/steps`, { method: "POST", body: JSON.stringify(data) }),
  complete: (productId: string) =>
    apiFetch<any>(`/weaver/products/${productId}/complete`, { method: "POST" }),
  qrUrl: (productId: string) => API_BASE ? `${API_BASE}/weaver/products/${productId}/qr` : `/api/weaver/products/${productId}/qr`,
};

export const adminApi = {
  dashboard: () => apiFetch<any>("/admin/dashboard"),
  weavers: (status?: string) => apiFetch<any[]>(`/admin/weavers${status ? `?status=${status}` : ""}`),
  approveWeaver: (id: string) => apiFetch<any>(`/admin/weavers/${id}/approve`, { method: "POST" }),
  rejectWeaver: (id: string) => apiFetch<any>(`/admin/weavers/${id}/reject`, { method: "POST" }),
  products: () => apiFetch<any[]>("/admin/products"),
  registry: () => apiFetch<any[]>("/admin/registry"),
  addRegistry: (data: { craft_type: string; region: string; official_description: string }) =>
    apiFetch<any>("/admin/registry", { method: "POST", body: JSON.stringify(data) }),
  disputes: () => apiFetch<any[]>("/admin/disputes"),
  resolveDispute: (id: string, status: string) =>
    apiFetch<any>(`/admin/disputes/${id}/resolve`, { method: "POST", body: JSON.stringify({ status }) }),
  analytics: () => apiFetch<any>("/admin/analytics"),
  flagged: () => apiFetch<any[]>("/admin/flagged"),
  reviewFlagged: (entryId: string, action: string) =>
    apiFetch<any>(`/admin/flagged/${entryId}/review`, { method: "POST", body: JSON.stringify({ action }) }),
  spotChecks: () => apiFetch<any[]>("/admin/spot-checks"),
  reviewSpotCheck: (productId: string, action: string) =>
    apiFetch<any>(`/admin/spot-checks/${productId}/review`, { method: "POST", body: JSON.stringify({ action }) }),
  whitelist: (status?: string, role?: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (role) params.set("role", role);
    const qs = params.toString();
    return apiFetch<any[]>("/admin/whitelist" + (qs ? "?" + qs : ""));
  },
  createWhitelist: (data: { identifier: string; requested_role: string; applicant_name?: string; applicant_location?: string; applicant_craft?: string; review_note?: string }) =>
    apiFetch<any>("/admin/whitelist", { method: "POST", body: JSON.stringify(data) }),
  approveWhitelist: (id: string, note?: string) =>
    apiFetch<any>("/admin/whitelist/" + id + "/approve", { method: "POST", body: JSON.stringify({ review_note: note }) }),
  rejectWhitelist: (id: string, note: string) =>
    apiFetch<any>("/admin/whitelist/" + id + "/reject", { method: "POST", body: JSON.stringify({ review_note: note }) }),
  revokeWhitelist: (id: string, note: string) =>
    apiFetch<any>("/admin/whitelist/" + id + "/revoke", { method: "POST", body: JSON.stringify({ review_note: note }) }),
  auditWhitelist: (id: string) =>
    apiFetch<any[]>("/admin/whitelist/" + id + "/audit"),
  bulkWhitelist: (ids: string[], action: "approve" | "reject", note?: string) =>
    apiFetch<any>("/admin/whitelist/bulk", { method: "POST", body: JSON.stringify({ ids, action, review_note: note }) }),
  retailers: (status?: string) => apiFetch<any[]>(`/admin/retailers${status ? `?status=${status}` : ""}`),
  approveRetailer: (id: string) => apiFetch<any>(`/admin/retailers/${id}/approve`, { method: "POST" }),
  rejectRetailer: (id: string) => apiFetch<any>(`/admin/retailers/${id}/reject`, { method: "POST" }),
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
};
