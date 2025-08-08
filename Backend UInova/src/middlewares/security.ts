import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Sécurise les headers
export const securityHeaders = helmet();

// Limite les requêtes (100/minute par IP)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
