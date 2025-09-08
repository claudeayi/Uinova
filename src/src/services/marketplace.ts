// src/services/marketplace.ts
import http from "./http";

/* ============================================================================
 * Typings
 * ========================================================================== */
export type MarketplaceItemType = "template" | "component";
export type MarketplaceItemStatus = "draft" | "published" | "archived";

export interface MarketplaceItem {
  id: string;
  title: string;
  description?: string;
  priceCents?: number | null;
  type: MarketplaceItemType;
  status?: MarketplaceItemStatus;
  previewUrl?: string;
  author?: { id: string; email: string };
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface PurchaseResponse {
  success: boolean;
  projectId?: string;
  downloadUrl?: string;
}

export interface MarketplaceItemPayload {
  title: string;
  description?: string;
  priceCents?: number | null;
  type: MarketplaceItemType;
  previewUrl?: string;
  tags?: string[];
  status?: MarketplaceItemStatus;
}

/* ============================================================================
 * Utils
 * ========================================================================== */
function emitEvent(name: string, detail?: any) {
  window.dispatchEvent(new CustomEvent(`marketplace:${name}`, { detail }));
}

export function formatPrice(cents?: number | null, currency = "EUR") {
  if (!cents) return "Gratuit";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function downloadFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

/* ============================================================================
 * API Marketplace
 * ========================================================================== */

/**
 * 📦 Liste tous les items de la Marketplace (option: filtres/pagination)
 */
export async function getMarketplaceItems(params?: {
  type?: MarketplaceItemType;
  status?: MarketplaceItemStatus;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<MarketplaceItem[]> {
  try {
    const res = await http.get("/marketplace/items", { params });
    return res.data.data || res.data;
  } catch (err) {
    console.error("❌ Erreur récupération marketplace:", err);
    return [];
  }
}

/**
 * 📦 Récupère un item spécifique
 */
export async function getMarketplaceItem(id: string): Promise<MarketplaceItem | null> {
  try {
    const res = await http.get(`/marketplace/items/${id}`);
    return res.data;
  } catch (err) {
    console.error("❌ Erreur récupération item:", err);
    return null;
  }
}

/**
 * 🛒 Achète ou installe un item
 */
export async function purchaseItem(
  itemId: string,
  projectId?: string
): Promise<PurchaseResponse | null> {
  try {
    const res = await http.post(`/marketplace/purchase`, { itemId, projectId });
    emitEvent("purchase", { itemId, projectId });
    return res.data;
  } catch (err) {
    console.error("❌ Erreur achat item:", err);
    return null;
  }
}

/**
 * ➕ Publie un nouvel item (admin ou créateur)
 */
export async function publishItem(payload: MarketplaceItemPayload): Promise<MarketplaceItem | null> {
  try {
    const res = await http.post(`/marketplace/items`, payload);
    emitEvent("created", res.data);
    return res.data;
  } catch (err) {
    console.error("❌ Erreur publication item:", err);
    return null;
  }
}

/**
 * ✏️ Met à jour un item existant
 */
export async function updateMarketplaceItem(
  id: string,
  payload: Partial<MarketplaceItemPayload>
): Promise<MarketplaceItem | null> {
  try {
    const res = await http.put(`/marketplace/items/${id}`, payload);
    emitEvent("updated", { id, payload });
    return res.data;
  } catch (err) {
    console.error("❌ Erreur mise à jour item:", err);
    return null;
  }
}

/**
 * 🗑️ Supprime un item marketplace
 */
export async function deleteMarketplaceItem(id: string): Promise<boolean> {
  try {
    await http.delete(`/marketplace/items/${id}`);
    emitEvent("deleted", { id });
    return true;
  } catch (err) {
    console.error("❌ Erreur suppression item:", err);
    return false;
  }
}

/* ============================================================================
 * Fonctions avancées
 * ========================================================================== */

/**
 * ⭐ Ajouter un favori
 */
export async function favoriteItem(id: string): Promise<boolean> {
  try {
    await http.post(`/marketplace/items/${id}/favorite`);
    emitEvent("favorited", { id });
    return true;
  } catch (err) {
    console.error("❌ Erreur ajout favori:", err);
    return false;
  }
}

/**
 * 📥 Télécharger le preview d’un item
 */
export async function downloadItemPreview(item: MarketplaceItem) {
  if (!item.previewUrl) return;
  try {
    const res = await http.get(item.previewUrl, { responseType: "blob" });
    downloadFile(res.data, `preview_${item.id}.png`);
  } catch (err) {
    console.error("❌ Erreur downloadItemPreview:", err);
  }
}

/* ============================================================================
 * Helpers exposés
 * ========================================================================== */
export const MarketplaceHelpers = {
  formatPrice,
  emitEvent,
  downloadFile,
};
