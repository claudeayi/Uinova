import { Router } from "express";
import { stripeIntent } from "../controllers/paymentController";
import { auth } from "../middlewares/auth";

const router = Router();

router.post("/stripe", auth, stripeIntent);
// Ajoute ici Paypal, Cinetpay, Mock si tu veux

export default router;
