import { useEffect, useState } from "react";
import { getUsageReport } from "@/services/billing";
import { Card } from "@/components/advanced/Card";
import { useToast } from "@/hooks/useToast";

export default function BillingPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    setLoading(true);
    try {
      const data = await getUsageReport();
      setReport(data);
    } catch (e: any) {
      toast.error("Impossible de charger le rapport d’usage");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Facturation & Usage</h1>
      {loading && <p>Chargement...</p>}
      {report && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card title="API Calls">{report.api}</Card>
          <Card title="Projets">{report.projects}</Card>
          <Card title="Stockage">{report.storageMB.toFixed(2)} MB</Card>
        </div>
      )}
    </div>
  );
}
