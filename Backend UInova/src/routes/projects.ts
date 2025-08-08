import { Router } from "express";
import { getAll, getOne, create, update, remove } from "../controllers/projectController";
import { auth } from "../middlewares/auth";
import { validateProject } from "../middlewares/validate";

const router = Router();

router.get("/", auth, getAll);
router.get("/:id", auth, getOne);
router.post("/", auth, validateProject, create);
router.put("/:id", auth, validateProject, update);
router.delete("/:id", auth, remove);

export default router;
