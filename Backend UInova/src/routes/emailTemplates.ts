import { Router } from "express";
import { authenticate, authorize } from "../middlewares/security";
import { prisma } from "../utils/prisma";

const router = Router();
router.use(authenticate, authorize(["ADMIN"]));

// 📩 Lister tous les templates
router.get("/", async (_req, res) => {
  const templates = await prisma.emailTemplate.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ success: true, data: templates });
});

// 📩 Créer un template
router.post("/", async (req, res) => {
  const { code, name, subject, bodyHtml, bodyText } = req.body;
  const tpl = await prisma.emailTemplate.create({
    data: { code, name, subject, bodyHtml, bodyText },
  });
  res.status(201).json({ success: true, data: tpl });
});

// 📩 Mettre à jour un template
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, subject, bodyHtml, bodyText } = req.body;
  const tpl = await prisma.emailTemplate.update({
    where: { id },
    data: { name, subject, bodyHtml, bodyText },
  });
  res.json({ success: true, data: tpl });
});

// 📩 Supprimer un template
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  await prisma.emailTemplate.delete({ where: { id } });
  res.json({ success: true });
});

// 📩 Tester un template
router.post("/:id/test", async (req, res) => {
  const { id } = req.params;
  const { to, variables } = req.body;
  const tpl = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!tpl) return res.status(404).json({ success: false, message: "Template introuvable" });

  try {
    const { sendTemplatedEmail } = await import("../services/emailService");
    await sendTemplatedEmail(tpl.code, to, variables || {});
    res.json({ success: true, message: "Email test envoyé" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
