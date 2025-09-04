import { createQueue } from "./utils/redis";

// Déclare toutes les queues
export const emailQueue = createQueue("email");
export const exportQueue = createQueue("export");
export const deployQueue = createQueue("deploy");
export const billingQueue = createQueue("billing");
