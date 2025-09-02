import { Router } from "express";
import { authenticate } from "../middlewares/security";
import { createApiKey, listApiKeys, revokeApiKey } from "../controllers/apiKeyController";
import { param } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";

const router = Router();
router.use(authenticate);

router.post("/", createApiKey);
router.get("/", listApiKeys);
router.delete("/:id", param("id").isString(), handleValidationErrors, revokeApiKey);

export default router;
