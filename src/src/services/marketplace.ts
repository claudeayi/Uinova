import http from "./http";

export async function getMarketplaceItems() {
  const res = await http.get("/marketplace/items");
  return res.data; // [{id,title,description,price}, ...]
}

export async function getMarketplaceItem(id: string) {
  const res = await http.get(`/marketplace/items/${id}`);
  return res.data;
}

export async function purchaseItem(itemId: string) {
  const res = await http.post(`/marketplace/purchase`, { itemId });
  return res.data; // { success: true, downloadUrl }
}

export async function publishItem(payload: any) {
  const res = await http.post(`/marketplace/items`, payload);
  return res.data; // { success: true, id }
}
