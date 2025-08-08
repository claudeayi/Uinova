import { Router } from "express";
import { upload } from "../middlewares/upload";
import { upload as uploadController } from "../controllers/uploadController";
import { auth } from "../middlewares/auth";

const router = Router();

router.post("/", auth, upload.single("file"), uploadController);

export default router;
