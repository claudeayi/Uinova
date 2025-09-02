import { createQueue } from "../utils/redis";

// ⚡ Queues principales UInova
export const exportQueue = createQueue("export");
export const deployQueue = createQueue("deploy");
export const aiQueue = createQueue("ai");
export const replayQueue = createQueue("replay");
