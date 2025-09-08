// src/services/billing.ts
import http from "./http";

/* ============================================================================
 * Typings
 * ========================================================================== */
export type InvoiceStatus = "paid" | "pending" | "failed";

export interface UsageReport {
  apiCalls: number;
  projects: number;
  storage: number; // en MB
  period?: { start: string; end: string };
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  url: string;
}

/* ============================================================================
 * Cache interne
 * ========================================================================== */
let usageCache: UsageReport | null = null;
let invoicesCache: Invoice[] = [];

/* ============================================================================
 * Utils
 * ========================================================================== */
function emitEvent(name: string, detail?: any) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(amount);
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
 * API Billing
 * ========================================================================== */

// ✅ Récupérer rapport d’usage (avec cache optionnel)
export async function getUsageReport(force = false): Promise<UsageReport | null> {
  if (!force && usageCache) return usageCache;
  try {
    const res = await http.get("/billing/usage");
    if (!res.data || typeof res.data.apiCalls !== "number") {
      throw new Error("Format usage invalide");
    }
    usageCache = res.data;
    emitEvent("billing:updated", res.data);
    return usageCache;
  } catch (err) {
    console.error("❌ Erreur getUsageReport:", err);
    return null;
  }
}

// ✅ Lister factures (avec cache optionnel)
export async function getInvoices(force = false): Promise<Invoice[]> {
  if (!force && invoicesCache.length > 0) return invoicesCache;
  try {
    const res = await http.get("/billing/invoices");
    invoicesCache = res.data.data as Invoice[];
    return invoicesCache;
  } catch (err) {
    console.error("❌ Erreur getInvoices:", err);
    return [];
  }
}

// ✅ Récupérer une facture par ID
export async function getInvoiceById(id: string): Promise<Invoice | null> {
  try {
    const res = await http.get(`/billing/invoices/${id}`);
    return res.data as Invoice;
  } catch (err) {
    console.error(`❌ Erreur getInvoiceById(${id}):`, err);
    return null;
  }
}

// ✅ Lister factures par statut
export async function getInvoicesByStatus(status: InvoiceStatus): Promise<Invoice[]> {
  const invoices = await getInvoices();
  return invoices.filter((i) => i.status === status);
}

// ✅ Générer facture PDF
export async function downloadInvoicePdf(invoiceId: string) {
  try {
    const res = await http.get(`/billing/invoices/${invoiceId}/pdf`, {
      responseType: "blob",
    });
    const filename = `facture_${invoiceId}.pdf`;
    downloadFile(res.data, filename);
    return true;
  } catch (err) {
    console.error("❌ Erreur downloadInvoicePdf:", err);
    return false;
  }
}

// ✅ Exporter factures CSV
export async function exportInvoicesCsv(invoices: Invoice[]) {
  try {
    const header = "ID,Date,Montant,Devise,Statut,URL\n";
    const rows = invoices
      .map(
        (i) =>
          `${i.id},${i.date},${i.amount},${i.currency},${i.status},${i.url}`
      )
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    downloadFile(blob, "factures.csv");
  } catch (err) {
    console.error("❌ Erreur exportInvoicesCsv:", err);
  }
}

// ✅ Exporter factures JSON
export async function exportInvoicesJson(invoices: Invoice[]) {
  try {
    const blob = new Blob([JSON.stringify(invoices, null, 2)], {
      type: "application/json",
    });
    downloadFile(blob, "factures.json");
  } catch (err) {
    console.error("❌ Erreur exportInvoicesJson:", err);
  }
}

// ✅ Nettoyer le cache
export function clearBillingCache() {
  usageCache = null;
  invoicesCache = [];
  console.info("🧹 Cache billing vidé");
}

/* ============================================================================
 * Helpers exposés
 * ========================================================================== */
export const BillingHelpers = {
  formatCurrency,
  emitEvent,
  downloadFile,
  clearBillingCache,
};
