import { Request, Response } from "express";
import * as templateService from "../services/templateService";

export async function getAllTemplates(_req: Request, res: Response) {
  try {
    const templates = await templateService.listTemplates();
    res.json({ success: true, templates });
  } catch (err) {
    console.error("❌ getAllTemplates:", err);
    res.status(500).json({ success: false, error: "Erreur récupération templates" });
  }
}

export async function getTemplateById(req: Request, res: Response) {
  try {
    const template = await templateService.getTemplate(req.params.id);
    if (!template) return res.status(404).json({ error: "Template introuvable" });
    res.json({ success: true, template });
  } catch (err) {
    console.error("❌ getTemplateById:", err);
    res.status(500).json({ success: false, error: "Erreur template" });
  }
}

export async function publishTemplate(req: Request, res: Response) {
  try {
    const { name, description, price, json } = req.body;
    const template = await templateService.createTemplate({ name, description, price, json });
    res.json({ success: true, template });
  } catch (err) {
    console.error("❌ publishTemplate:", err);
    res.status(500).json({ success: false, error: "Erreur publication template" });
  }
}
