import { Router } from "express";
import { authenticate } from "../middlewares/security";
import {
  listPurchases,
  createPurchase,
  getPurchase,
  deletePurchase,
} from "../controllers/purchaseController";

const router = Router();

// Toutes les routes nécessitent authentification
router.use(authenticate);

// 📂 GET liste
router.get("/", listPurchases);

// ➕ POST création
router.post("/", createPurchase);

// 📑 GET détail
router.get("/:id", getPurchase);

// ❌ DELETE annulation
router.delete("/:id", deletePurchase);

export default router;
