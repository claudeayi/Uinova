import client from "prom-client";
import { prisma } from "../utils/prisma";

export async function collectDeploymentMetrics() {
  const gaugeSuccess = new client.Gauge({
    name: "uinova_deployments_success_total",
    help: "Nombre de déploiements réussis",
  });
  const gaugeError = new client.Gauge({
    name: "uinova_deployments_error_total",
    help: "Nombre de déploiements échoués",
  });

  const [success, error] = await Promise.all([
    prisma.deployment.count({ where: { status: "SUCCESS" } }),
    prisma.deployment.count({ where: { status: "ERROR" } }),
  ]);

  gaugeSuccess.set(success);
  gaugeError.set(error);
}
