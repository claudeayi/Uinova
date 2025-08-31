// src/services/deployService.ts
import fs from "fs";
import path from "path";
import { prisma } from "../utils/prisma";
import { exportProject } from "./exportService";
import { randomUUID } from "crypto";

export type DeployTarget = "local" | "s3" | "netlify" | "vercel";

export interface DeployOptions {
  projectId: string;
  userId: string;
  format?: "html" | "flutter" | "json"; // par défaut "html"
  target?: DeployTarget;                // cible déploiement
  meta?: Record<string, any>;           // metadata libre (env, branch, etc.)
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
  // 1. Générer un export temporaire
  const baseDir = path.join(process.cwd(), "deployments");
  ensureDir(baseDir);

  const deployId = randomUUID();
  const deployDir = path.join(baseDir, deployId);
  ensureDir(deployDir);

  const result = await exportProject({
    projectId,
    format,
    outputDir: deployDir,
    userId,
  });

  // 2. Déterminer URL d’accès (ici version locale)
  let url = "";
  if (target === "local") {
    url = `/deployments/${deployId}/index.html`;
  } else if (target === "netlify") {
    url = `https://your-netlify-site.netlify.app/${deployId}/`;
    // 👉 TODO: push via API Netlify (V4)
  } else if (target === "vercel") {
    url = `https://your-vercel-site.vercel.app/${deployId}/`;
    // 👉 TODO: push via API Vercel (V4)
  } else if (target === "s3") {
    url = `https://your-bucket.s3.amazonaws.com/${deployId}/index.html`;
    // 👉 TODO: upload vers AWS S3
  }

  // 3. Persister dans la DB
  const deployment = await prisma.deployment.create({
    data: {
      id: deployId,
      projectId,
      userId,
      target,
      url,
      status: "SUCCESS",
      meta,
    },
  });

  // 4. Audit
  await prisma.auditLog.create({
    data: {
      userId,
      action: "DEPLOY_PROJECT",
      details: JSON.stringify({
        projectId,
        deployId,
        target,
        url,
      }),
    },
  });

  return {
    deploymentId: deployment.id,
    url: deployment.url,
    target: deployment.target as DeployTarget,
  };
}
