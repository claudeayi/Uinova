import { Queue, Worker, QueueScheduler } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");

// Queues disponibles
export const queues = {
  export: new Queue("export", { connection }),
  deploy: new Queue("deploy", { connection }),
  webhook: new Queue("webhook", { connection }),
  email: new Queue("email", { connection }),
};

// Schedulers (retry + delayed jobs)
new QueueScheduler("export", { connection });
new QueueScheduler("deploy", { connection });
new QueueScheduler("webhook", { connection });
new QueueScheduler("email", { connection });

// Helper pour ajouter un job
export async function addJob(queue: keyof typeof queues, name: string, data: any) {
  return queues[queue].add(name, data, {
    attempts: 5, // retries max
    backoff: { type: "exponential", delay: 5000 }, // retry exponentiel
    removeOnComplete: 50,
    removeOnFail: 100,
  });
}
