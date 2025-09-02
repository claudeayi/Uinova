// src/services/deployService.ts
import fs from "fs";
import path from "path";
import { prisma } from "../utils/prisma";
import { exportProject } from "./exportService";
import { randomUUID } from "crypto";
import { emitEvent } from "./eventBus";

export type DeployTarget = "local" | "s3" | "netlify" | "vercel";

export interface DeployOptions {
  projectId: string;
  userId: string;
  format?: "html" | "flutter" | "json"; // par défaut "html"
  target?: DeployTarget;                // cible déploiement
  meta?: Record<string, any>;           // metadata libre (env, branch, commitId, etc.)
}

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
        // 👉 TODO: push via API Netlify
        break;
      case "vercel":
        url = `https://your-vercel-site.vercel.app/${deployId}/`;
        // 👉 TODO: push via API Vercel
        break;
      case "s3":
        url = `https://your-bucket.s3.amazonaws.com/${deployId}/index.html`;
        // 👉 TODO: upload vers AWS S3
        break;
    }

    // 3. MAJ en DB
    const updated = await prisma.deployment.update({
      where: { id: deployId },
      data: { status: "SUCCESS", url },
    });

    // 4. Audit + Event
    await prisma.auditLog.create({
      data: {
        userId,
        action: "DEPLOY_PROJECT",
        metadata: { projectId, deployId, target, url },
      },
    });

    emitEvent("project.deployed", {
      deploymentId: deployId,
      projectId,
      userId,
      target,
      url,
    });

    return {
      deploymentId: updated.id,
      url: updated.url!,
      target: updated.target as DeployTarget,
    };
  } catch (err: any) {
    // Échec
    await prisma.deployment.update({
      where: { id: deployId },
      data: { status: "ERROR", meta: { ...meta, error: err.message } },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "DEPLOY_ERROR",
        metadata: { projectId, deployId, target, error: err.message },
      },
    });

    throw err;
  }
}
