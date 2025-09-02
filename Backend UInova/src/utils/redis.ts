import { RedisOptions } from "ioredis";
import { Queue, Worker } from "bullmq";

const redisConfig: RedisOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
};

export function createQueue(name: string) {
  return new Queue(name, { connection: redisConfig });
}

export function createWorker(
  name: string,
  processor: (job: any) => Promise<any>
) {
  return new Worker(name, processor, { connection: redisConfig });
}
