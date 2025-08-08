import { Router } from "express";
import { listUsers, deleteUser } from "../controllers/adminController";
import { auth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/users", auth, requireRole(["admin"]), listUsers);
router.delete("/users/:id", auth, requireRole(["admin"]), deleteUser);

export default router;
