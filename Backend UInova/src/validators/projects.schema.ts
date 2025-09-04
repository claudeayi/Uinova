import { z } from "zod";

export const CreateProjectSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  status: z.enum(["PLANIFIE", "EN_COURS", "TERMINE"]).default("PLANIFIE"),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().optional(),
  status: z.enum(["PLANIFIE", "EN_COURS", "TERMINE"]).optional(),
});
