import { Router } from "express";
import { authenticate } from "../middlewares/security";

const router = Router();

// ⚡ Ces routes sont minimales : la vraie synchro se fait via Socket.io (collabService)
router.use(authenticate);

/**
 * GET /api/collab/:projectId/state
 * Récupérer l’état CRDT d’un projet
 */
router.get("/:projectId/state", (req, res) => {
  const { projectId } = req.params;
  // Placeholder: renvoyer l'état encodé (si besoin côté REST)
  res.json({ projectId, message: "Utiliser Socket.io pour sync en temps réel" });
});

export default router;
