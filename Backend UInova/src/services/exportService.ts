import fs from "fs";
import path from "path";
import { prisma } from "../utils/prisma";
import { randomUUID } from "crypto";
import { emitEvent } from "./eventBus";
import { logger } from "../utils/logger";
import client from "prom-client";
import { z } from "zod";

/* ============================================================================
 *  Types & Schemas
 * ========================================================================== */
export type ExportFormat = "html" | "flutter" | "json" | "react" | "vue" | "pdf";

const ExportSchema = z.object({
  format: z.enum(["html", "flutter", "json", "react", "vue", "pdf"]),
  projectId: z.string().uuid(),
  outputDir: z.string().optional(),
  userId: z.string().optional(),
});

interface ExportOptions {
  format: ExportFormat;
  projectId: string;
  outputDir?: string;
  userId?: string;
}

/* ============================================================================
 * 📊 Prometheus Metrics
 * ========================================================================== */
const counterExportSuccess = new client.Counter({
  name: "uinova_export_success_total",
  help: "Nombre d’exports réussis",
  labelNames: ["format"] as const,
});

const counterExportFail = new client.Counter({
  name: "uinova_export_fail_total",
  help: "Nombre d’exports échoués",
  labelNames: ["format"] as const,
});

const histogramExportDuration = new client.Histogram({
  name: "uinova_export_duration_seconds",
  help: "Durée des exports en secondes",
  labelNames: ["format"] as const,
  buckets: [0.5, 1, 2, 5, 10, 30],
});

/* ============================================================================
 *  Helpers
 * ========================================================================== */
function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function safeName(name: string, ext: string, id: string) {
  const n = name?.replace(/[^a-z0-9_-]+/gi, "_").toLowerCase() || "uinova_project";
  return `${n}_${id}.${ext}`;
}

/* ============================================================================
 *  Générateurs inline
 * ========================================================================== */
function generateHTML(project: any): string { /* inchangé */ ... }
function generateFlutter(project: any): string { /* inchangé */ ... }
function generateJSON(project: any): string { return JSON.stringify(project, null, 2); }
function generateReact(project: any): string { /* inchangé */ ... }
function generateVue(project: any): string { /* inchangé */ ... }

async function generatePDF(project: any, filePath: string) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let y = 750;
  let page = pdfDoc.addPage([600, 800]);
  page.drawText(project.name, { x: 50, y, size: 20, font, color: rgb(0, 0, 0) });
  y -= 40;

  for (const p of project.pages) {
    if (y < 50) { // Nouvelle page si trop bas
      page = pdfDoc.addPage([600, 800]);
      y = 750;
    }
    page.drawText(`${p.name}: ${p.content || ""}`, { x: 50, y, size: 12, font });
    y -= 20;
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(filePath, pdfBytes);
}

/* ============================================================================
 *  Export principal
 * ========================================================================== */
export async function exportProject(opts: ExportOptions): Promise<{
  path?: string;
  fileName?: string;
  size?: number;
  content: string;
}> {
  const { format, projectId, outputDir, userId } = ExportSchema.parse(opts);

  const start = Date.now();
  try {
    // 1. Charger projet + pages
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { pages: true },
    });
    if (!project) throw new Error(`Project not found: ${projectId}`);
    if (!project.pages?.length) throw new Error(`Project ${projectId} has no pages to export`);

    // 2. Préparer répertoire
    const out = outputDir || path.join(process.cwd(), "exports");
    ensureDir(out);

    // 3. Générer contenu
    let content = "";
    let filePath: string | undefined;

    switch (format) {
      case "html":
        content = generateHTML(project);
        filePath = path.join(out, safeName(project.name, "html", projectId));
        fs.writeFileSync(filePath, content, "utf-8");
        break;
      case "flutter":
        content = generateFlutter(project);
        filePath = path.join(out, safeName(project.name, "dart", projectId));
        fs.writeFileSync(filePath, content, "utf-8");
        break;
      case "json":
        content = generateJSON(project);
        filePath = path.join(out, safeName(project.name, "json", projectId));
        fs.writeFileSync(filePath, content, "utf-8");
        break;
      case "react":
        content = generateReact(project);
        filePath = path.join(out, safeName(project.name, "tsx", projectId));
        fs.writeFileSync(filePath, content, "utf-8");
        break;
      case "vue":
        content = generateVue(project);
        filePath = path.join(out, safeName(project.name, "vue", projectId));
        fs.writeFileSync(filePath, content, "utf-8");
        break;
      case "pdf":
        filePath = path.join(out, safeName(project.name, "pdf", projectId));
        await generatePDF(project, filePath);
        content = fs.readFileSync(filePath).toString("base64");
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    const duration = (Date.now() - start) / 1000;
    counterExportSuccess.labels(format).inc();
    histogramExportDuration.labels(format).observe(duration);

    // 4. Audit enrichi
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action: "EXPORT_PROJECT",
        details: `Export ${format} de ${projectId}`,
        metadata: { projectId, format, pages: project.pages.length, filePath, duration },
      },
    });

    emitEvent("project.exported", { projectId, format, filePath, userId });

    logger.info(`✅ Export ${format} réussi`, { projectId, format, filePath, duration });

    return {
      path: filePath,
      fileName: path.basename(filePath!),
      size: fs.statSync(filePath!).size,
      content,
    };
  } catch (err: any) {
    counterExportFail.labels(opts.format).inc();

    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action: "EXPORT_PROJECT_FAILED",
        details: `Export ${opts.format} échoué pour ${opts.projectId}`,
        metadata: { error: err.message },
      },
    });

    emitEvent("project.export_failed", { projectId: opts.projectId, format: opts.format, error: err.message });

    logger.error("❌ exportProject error:", { error: err.message, opts });

    throw new Error(err?.message || "Failed to export project");
  }
}
