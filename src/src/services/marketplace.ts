import http from "./http";

/**
 * Types utilisés
 */
export interface MarketplaceItem {
  id: string;
  title: string;
  description?: string;
  priceCents?: number | null;
  type: "template" | "component";
  previewUrl?: string;
  createdAt: string;
}

export interface PurchaseResponse {
  success: boolean;
  projectId?: string;
  downloadUrl?: string;
}

/**
 * 📦 Liste tous les items de la Marketplace
 */
export async function getMarketplaceItems(): Promise<MarketplaceItem[]> {
  try {
    const res = await http.get("/marketplace/items");
    return res.data;
  } catch (err) {
    console.error("❌ Erreur récupération marketplace:", err);
    throw err;
  }
}

/**
 * 📦 Récupère un item spécifique
 */
export async function getMarketplaceItem(id: string): Promise<MarketplaceItem> {
  try {
    const res = await http.get(`/marketplace/items/${id}`);
    return res.data;
  } catch (err) {
    console.error("❌ Erreur récupération item:", err);
    throw err;
  }
}

/**
 * 🛒 Achète ou installe un item
 */
export async function purchaseItem(
  itemId: string,
  projectId?: string
): Promise<PurchaseResponse> {
  try {
    const res = await http.post(`/marketplace/purchase`, { itemId, projectId });
    return res.data;
  } catch (err) {
    console.error("❌ Erreur achat item:", err);
    throw err;
  }
}

/**
 * ➕ Publie un nouvel item (admin ou créateur)
 */
export async function publishItem(payload: any): Promise<{ success: boolean; id: string }> {
  try {
    const res = await http.post(`/marketplace/items`, payload);
    return res.data;
  } catch (err) {
    console.error("❌ Erreur publication item:", err);
    throw err;
  }
}

/**
 * ✏️ Met à jour un item existant
 */
export async function updateMarketplaceItem(
  id: string,
  payload: any
): Promise<{ success: boolean; id: string }> {
  try {
    const res = await http.put(`/marketplace/items/${id}`, payload);
    return res.data;
  } catch (err) {
    console.error("❌ Erreur mise à jour item:", err);
    throw err;
  }
}

/**
 * 🗑️ Supprime un item marketplace
 */
export async function deleteMarketplaceItem(id: string): Promise<{ success: boolean }> {
  try {
    const res = await http.delete(`/marketplace/items/${id}`);
    return res.data;
  } catch (err) {
    console.error("❌ Erreur suppression item:", err);
    throw err;
  }
}
