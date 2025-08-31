import { Request, Response } from "express";
import { prisma } from "../../utils/prisma";

/* ============================================================================
 *  MARKETPLACE ADMIN CONTROLLER
 * ========================================================================== */

// 📋 Liste des items du marketplace
export async function listMarketplaceItems(_req: Request, res: Response) {
  try {
    const items = await prisma.marketplaceItem.findMany({
      include: {
        author: { select: { id: true, email: true } },
        purchases: { select: { id: true, userId: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: items });
  } catch (err) {
    console.error("❌ listMarketplaceItems error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération items marketplace" });
  }
}

// ✅ Validation d’un item (admin approuve ou rejette)
export async function validateMarketplaceItem(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { validated } = req.body;

    const item = await prisma.marketplaceItem.update({
      where: { id },
      data: { validated: Boolean(validated) },
    });

    res.json({ success: true, data: item });
  } catch (err) {
    console.error("❌ validateMarketplaceItem error:", err);
    res.status(500).json({ success: false, message: "Erreur validation item" });
  }
}

// 🗑️ Suppression d’un item du marketplace
export async function deleteMarketplaceItem(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Supprimer aussi les achats liés pour éviter les orphelins
    await prisma.purchase.deleteMany({ where: { itemId: id } });
    await prisma.marketplaceItem.delete({ where: { id } });

    res.json({ success: true, message: `Item ${id} supprimé` });
  } catch (err) {
    console.error("❌ deleteMarketplaceItem error:", err);
    res.status(500).json({ success: false, message: "Erreur suppression item marketplace" });
  }
}
