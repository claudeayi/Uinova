import { z } from "zod";

export const StartReplaySchema = z.object({
  projectId: z.string(),
});

export const StopReplaySchema = z.object({
  replayId: z.string(),
  dataUrl: z.string().url(),
});
