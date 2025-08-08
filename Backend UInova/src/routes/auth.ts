import { Router } from "express";
import { register, login, me } from "../controllers/authController";
import { auth } from "../middlewares/auth";
import { validateRegister } from "../middlewares/validate";

/**
 * Auth endpoints
 */
const router = Router();

router.post("/register", validateRegister, register);
router.post("/login", login);
router.get("/me", auth, me);

export default router;
