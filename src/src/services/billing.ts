import http from "./http";

// ✅ Récupérer rapport usage
export async function getUsageReport() {
  const res = await http.get("/billing/usage");
  return res.data;
}

// ✅ (optionnel) Lister factures
export async function getInvoices() {
  const res = await http.get("/billing/invoices");
  return res.data.data;
}

// ✅ (optionnel) Générer facture PDF
export async function downloadInvoicePdf(invoiceId: string) {
  const res = await http.get(`/billing/invoices/${invoiceId}/pdf`, { responseType: "blob" });
  return res.data;
}
