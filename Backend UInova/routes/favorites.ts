import { Router } from "express";
import { authenticate } from "../middlewares/security";
import { listFavorites, addFavorite, removeFavorite } from "../controllers/favoriteController";

const router = Router();
router.use(authenticate);

router.get("/", listFavorites);
router.post("/", addFavorite);
router.delete("/:id", removeFavorite);

export default router;
