import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";

// Exemple de schéma de validation pour l’inscription
export const validateRegister = [
  body("email").isEmail().withMessage("Email invalide"),
  body("password").isLength({ min: 6 }).withMessage("Mot de passe trop court"),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

// Valide la présence d’un champ “name” par exemple
export const validateProject = [
  body("name").notEmpty().withMessage("Le nom est obligatoire"),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
