import fs from "fs";
import path from "path";
import { prisma } from "../utils/prisma";
import { exportProject } from "./exportService";
import { randomUUID } from "crypto";
import { emitEvent } from "./eventBus";
import { logger } from "../utils/logger";
import client from "prom-client";

export type DeployTarget = "local" | "s3" | "netlify" | "vercel";

export interface DeployOptions {
  projectId: string;
  userId: string;
  format?: "html" | "flutter" | "json" | "react" | "vue" | "pdf";
  target?: DeployTarget;
  meta?: Record<string, any>;
  ip?: string;
}

/* ============================================================================
 * 📊 Prometheus Metrics
 * ========================================================================== */
const counterDeploySuccess = new client.Counter({
  name: "uinova_deploy_success_total",
  help: "Nombre de déploiements réussis",
});

const counterDeployFail = new client.Counter({
  name: "uinova_deploy_fail_total",
  help: "Nombre de déploiements échoués",
});

const histogramDeployDuration = new client.Histogram({
  name: "uinova_deploy_duration_seconds",
  help: "Durée des déploiements en secondes",
  buckets: [1, 5, 10, 30, 60, 120, 300],
});

const counterDeployByTarget = new client.Counter({
  name: "uinova_deploy_target_total",
  help: "Nombre de déploiements par cible",
  labelNames: ["target"] as const,
});

const counterDeployRetries = new client.Counter({
  name: "uinova_deploy_retries_total",
  help: "Nombre de retries lors des déploiements",
});

/* ============================================================================
 * Helpers
 * ========================================================================== */
function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function updateStatus(
  id: string,
  status: "PENDING" | "RUNNING" | "SUCCESS" | "ERROR",
  extra: any = {}
) {
  return prisma.deployment.update({
    where: { id },
    data: { status, ...extra },
  });
}

function backoffDelay(attempt: number) {
  // Exponential backoff avec jitter
  const base = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s...
  const jitter = Math.floor(Math.random() * 500);
  return base + jitter;
}

/* ============================================================================
 * Service principal
 * ========================================================================== */
export async function deployProject({
  projectId,
  userId,
  format = "html",
  target = "local",
  meta = {},
  ip,
}: DeployOptions): Promise<{ deploymentId: string; url: string; target: DeployTarget }> {
  const deployId = randomUUID();
  const baseDir = path.join(process.cwd(), "deployments");
  ensureDir(baseDir);

  const deployDir = path.join(baseDir, deployId);
  ensureDir(deployDir);

  const start = Date.now();

  // Enregistrer en "PENDING"
  await prisma.deployment.create({
    data: {
      id: deployId,
      projectId,
      userId,
      status: "PENDING",
      target,
      url: "",
      meta,
    },
  });

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      logger.info(`🚀 Déploiement démarré`, { deployId, projectId, userId, target, format, attempts });

      await updateStatus(deployId, "RUNNING");

      // 1. Export projet
      const result = await exportProject({
        projectId,
        format,
        outputDir: deployDir,
        userId,
      });

      // 2. Déterminer l’URL finale (mock ou API)
      let url = "";
      switch (target) {
        case "local":
          url = `/deployments/${deployId}/index.html`;
          break;
        case "netlify":
          url = `https://your-netlify-site.netlify.app/${deployId}/`;
          // TODO: Netlify API push
          break;
        case "vercel":
          url = `https://your-vercel-site.vercel.app/${deployId}/`;
          // TODO: Vercel API push
          break;
        case "s3":
          url = `https://your-bucket.s3.amazonaws.com/${deployId}/index.html`;
          // TODO: AWS S3 upload
          break;
      }

      // 3. MAJ en DB
      const updated = await updateStatus(deployId, "SUCCESS", { url });

      const duration = (Date.now() - start) / 1000;
      counterDeploySuccess.inc();
      counterDeployByTarget.labels(target).inc();
      histogramDeployDuration.observe(duration);

      // 4. Audit + Event
      await prisma.auditLog.create({
        data: {
          userId,
          action: "DEPLOY_PROJECT",
          details: `Déploiement ${deployId} réussi sur ${target}`,
          metadata: { projectId, deployId, target, url, format, ip, meta, duration, attempts },
        },
      });

      emitEvent("project.deployed", { deploymentId: deployId, projectId, userId, target, url });

      logger.info(`✅ Déploiement réussi`, { deployId, url, duration, attempts });

      return {
        deploymentId: updated.id,
        url: updated.url!,
        target: updated.target as DeployTarget,
      };
    } catch (err: any) {
      const duration = (Date.now() - start) / 1000;
      counterDeployFail.inc();
      counterDeployRetries.inc();
      logger.error(`❌ Déploiement échoué (tentative ${attempts})`, {
        deployId,
        error: err.message,
        duration,
      });

      if (attempts >= maxAttempts) {
        await updateStatus(deployId, "ERROR", { meta: { ...meta, error: err.message } });

        await prisma.auditLog.create({
          data: {
            userId,
            action: "DEPLOY_ERROR",
            details: `Échec définitif du déploiement ${deployId}`,
            metadata: { projectId, deployId, target, error: err.message, ip, meta, duration, attempts },
          },
        });

        emitEvent("project.deploy_failed", { deploymentId: deployId, projectId, userId, target, error: err.message });
        throw err;
      } else {
        const delay = backoffDelay(attempts);
        logger.warn(`🔁 Retry automatique du déploiement ${deployId} dans ${delay}ms (tentative ${attempts + 1})`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw new Error("Déploiement impossible après plusieurs tentatives.");
}
