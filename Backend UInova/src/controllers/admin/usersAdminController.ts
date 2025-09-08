// src/controllers/admin/usersAdminController.ts
import { Request, Response } from "express";
import { prisma } from "../../utils/prisma";
import { z } from "zod";

/* ============================================================================
 * VALIDATION
 * ========================================================================== */
const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  suspended: z.boolean().optional(),
});

/* ============================================================================
 * HELPERS
 * ========================================================================== */
function ensureAdmin(req: Request) {
  const role = (req as any)?.user?.role;
  if (role !== "ADMIN") {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
}

async function auditLog(userId: string, action: string, metadata: any = {}) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, metadata },
    });
  } catch (err) {
    console.warn("⚠️ auditLog failed:", err);
  }
}

/* ============================================================================
 * CONTROLLERS
 * ========================================================================== */

// 📋 Liste tous les utilisateurs
export async function listUsers(_req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        suspended: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: users });
  } catch (err) {
    console.error("❌ listUsers error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération utilisateurs" });
  }
}

// 🔎 Détail d’un utilisateur
export async function getUserById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, createdAt: true, suspended: true },
    });
    if (!user) return res.status(404).json({ success: false, message: "Utilisateur introuvable" });

    res.json({ success: true, data: user });
  } catch (err) {
    console.error("❌ getUserById error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération utilisateur" });
  }
}

// ✏️ Mise à jour d’un utilisateur
export async function updateUser(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { id } = req.params;
    const body = UpdateUserSchema.parse(req.body);

    const updated = await prisma.user.update({
      where: { id },
      data: body,
      select: { id: true, email: true, role: true, suspended: true, updatedAt: true },
    });

    await auditLog((req as any).user?.id, "ADMIN_USER_UPDATE", { targetUserId: id, body });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("❌ updateUser error:", err);
    if (err?.code === "P2002") return res.status(409).json({ success: false, message: "Email déjà utilisé" });
    if (err?.code === "P2025") return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    res.status(500).json({ success: false, message: "Erreur mise à jour utilisateur" });
  }
}

// 🗑️ Suppression d’un utilisateur
export async function deleteUser(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { id } = req.params;

    await prisma.user.delete({ where: { id } });
    await auditLog((req as any).user?.id, "ADMIN_USER_DELETE", { targetUserId: id });

    res.json({ success: true, message: `Utilisateur ${id} supprimé` });
  } catch (err: any) {
    console.error("❌ deleteUser error:", err);
    if (err?.code === "P2025") return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    res.status(500).json({ success: false, message: "Erreur suppression utilisateur" });
  }
}

// 🚫 Suspension / réactivation
export async function suspendUser(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { id } = req.params;
    const { suspended } = z.object({ suspended: z.boolean() }).parse(req.body);

    const user = await prisma.user.update({
      where: { id },
      data: { suspended },
      select: { id: true, email: true, suspended: true, updatedAt: true },
    });

    await auditLog((req as any).user?.id, "ADMIN_USER_SUSPEND", { targetUserId: id, suspended });

    res.json({ success: true, data: user });
  } catch (err: any) {
    console.error("❌ suspendUser error:", err);
    if (err?.code === "P2025") return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    res.status(500).json({ success: false, message: "Erreur suspension utilisateur" });
  }
}

// 📊 Statistiques des utilisateurs (bonus)
export async function userStats(_req: Request, res: Response) {
  try {
    const [total, suspended, active] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { suspended: true } }),
      prisma.user.count({ where: { suspended: false } }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        active,
        suspended,
        last7d: await prisma.user.count({
          where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
        }),
      },
    });
  } catch (err) {
    console.error("❌ userStats error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération stats utilisateurs" });
  }
}
