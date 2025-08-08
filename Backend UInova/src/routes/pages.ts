import { Router } from "express";
import { list, get, create, update, remove } from "../controllers/pageController";
import { auth } from "../middlewares/auth";

const router = Router();

router.get("/:projectId", auth, list);
router.get("/page/:id", auth, get);
router.post("/:projectId", auth, create);
router.put("/page/:id", auth, update);
router.delete("/page/:id", auth, remove);

export default router;
