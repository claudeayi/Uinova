import { Router } from "express";
import {
  listItems,
  getItem,
  publishItem,
  purchaseItem,
} from "../controllers/marketplaceController";
import { authenticate } from "../middlewares/security";

const router = Router();

// Public
router.get("/items", listItems);
router.get("/items/:id", getItem);

// Protégé
router.post("/items", authenticate, publishItem);
router.post("/purchase", authenticate, purchaseItem);

export default router;
