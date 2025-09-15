// src/services/deployService.ts
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
  format?: "html" | "flutter" | "json"; // par défaut "html"
  target?: DeployTarget;                // cible déploiement
  meta?: Record<string, any>;           // metadata libre (env, branch, commitId, etc.)
  ip?: string;                          // IP de l’utilisateur (pour audit)
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
  help: "Durée des déploiements",
  buckets: [1, 5, 10, 30, 60, 120, 300],
});

/* ============================================================================
 * Helpers
 * ========================================================================== */
function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
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
}: DeployOptions): Promise<{
  deploymentId: string;
  url: string;
  target: DeployTarget;
}> {
  const deployId = randomUUID();
  const baseDir = path.join(process.cwd(), "deployments");
  ensureDir(baseDir);

  const deployDir = path.join(baseDir, deployId);
  ensureDir(deployDir);

  const start = Date.now();

  // Persister en état "PENDING"
  const deployment = await prisma.deployment.create({
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

  try {
    logger.info(`🚀 Déploiement démarré`, { deployId, projectId, userId, target, format });

    // 1. Générer export
    await prisma.deployment.update({
      where: { id: deployId },
      data: { status: "RUNNING" },
    });

    const result = await exportProject({
      projectId,
      format,
      outputDir: deployDir,
      userId,
    });

    // 2. Déterminer URL finale
    let url = "";
    switch (target) {
      case "local":
        url = `/deployments/${deployId}/index.html`;
        break;
      case "netlify":
        url = `https://your-netlify-site.netlify.app/${deployId}/`;
        // ⚡ TODO: push via API Netlify
        break;
      case "vercel":
        url = `https://your-vercel-site.vercel.app/${deployId}/`;
        // ⚡ TODO: push via API Vercel
        break;
      case "s3":
        url = `https://your-bucket.s3.amazonaws.com/${deployId}/index.html`;
        // ⚡ TODO: upload vers AWS S3
        break;
    }

    // 3. MAJ en DB
    const updated = await prisma.deployment.update({
      where: { id: deployId },
      data: { status: "SUCCESS", url },
    });

    const duration = (Date.now() - start) / 1000;
    counterDeploySuccess.inc();
    histogramDeployDuration.observe(duration);

    // 4. Audit + Event
    await prisma.auditLog.create({
      data: {
        userId,
        action: "DEPLOY_PROJECT",
        details: `Déploiement ${deployId} → ${target}`,
        metadata: { projectId, deployId, target, url, format, ip, meta },
      },
    });

    emitEvent("project.deployed", {
      deploymentId: deployId,
      projectId,
      userId,
      target,
      url,
    });

    logger.info(`✅ Déploiement réussi`, { deployId, url, duration });

    return {
      deploymentId: updated.id,
      url: updated.url!,
      target: updated.target as DeployTarget,
    };
  } catch (err: any) {
    const duration = (Date.now() - start) / 1000;
    counterDeployFail.inc();

    await prisma.deployment.update({
      where: { id: deployId },
      data: { status: "ERROR", meta: { ...meta, error: err.message } },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "DEPLOY_ERROR",
        details: `Échec déploiement ${deployId}`,
        metadata: { projectId, deployId, target, error: err.message, ip, meta },
      },
    });

    logger.error(`❌ Déploiement échoué`, { deployId, error: err.message, duration });

    throw err;
  }
}
