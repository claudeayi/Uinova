import { Request, Response } from "express";
import { prisma } from "../../utils/prisma";

/* ============================================================================
 *  USERS ADMIN CONTROLLER
 * ========================================================================== */

// 📋 Liste tous les utilisateurs
export async function listUsers(_req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, createdAt: true, suspended: true },
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
    const { id } = req.params;
    const { email, role, suspended } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { email, role, suspended },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    console.error("❌ updateUser error:", err);
    res.status(500).json({ success: false, message: "Erreur mise à jour utilisateur" });
  }
}

// 🗑️ Suppression d’un utilisateur
export async function deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: `Utilisateur ${id} supprimé` });
  } catch (err) {
    console.error("❌ deleteUser error:", err);
    res.status(500).json({ success: false, message: "Erreur suppression utilisateur" });
  }
}

// 🚫 Suspension / réactivation
export async function suspendUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { suspended } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { suspended: Boolean(suspended) },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    console.error("❌ suspendUser error:", err);
    res.status(500).json({ success: false, message: "Erreur suspension utilisateur" });
  }
}
