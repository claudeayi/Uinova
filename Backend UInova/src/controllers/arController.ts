import { Request, Response } from "express";
import * as arService from "../services/arService";

export async function getARPreview(_req: Request, res: Response) {
  try {
    const data = await arService.generateMockPreview();
    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ getARPreview:", err);
    res.status(500).json({ success: false, error: "Erreur génération AR" });
  }
}
