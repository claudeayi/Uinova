import cron from "node-cron";
import { AutoScalingService } from "../services/autoScalingService";

export function initScheduler() {
  const autoScaling = new AutoScalingService();

  // Vérifier les déploiements toutes les 2 minutes
  cron.schedule("*/2 * * * *", async () => {
    console.log("⏱️ Vérification auto-healing déploiements...");
    await autoScaling.monitorDeployments();
  });
}
