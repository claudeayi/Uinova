import { z } from "zod";

export const CreateDeploymentSchema = z.object({
  projectId: z.string(),
  targetUrl: z.string().url().optional(),
});

export const DeploymentStatusSchema = z.object({
  projectId: z.string(),
});
