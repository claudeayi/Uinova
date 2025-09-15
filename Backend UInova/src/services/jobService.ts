import { exportQueue, deployQueue, aiQueue } from "../queues";
import client from "prom-client";

const jobDuration = new client.Histogram({
  name: "uinova_job_duration_seconds",
  help: "Durée des jobs par queue",
  labelNames: ["queue"] as const,
  buckets: [0.5, 1, 2, 5, 10, 30, 60],
});

export async function getQueueStats() {
  const queues = [
    { name: "export", queue: exportQueue },
    { name: "deploy", queue: deployQueue },
    { name: "ai", queue: aiQueue },
  ];

  const stats: any[] = [];
  for (const { name, queue } of queues) {
    const counts = await queue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed"
    );
    stats.push({
      queue: name,
      ...counts,
    });
  }
  return stats;
}

// Hooker Prometheus quand un job termine
function attachMetrics(queue: any, name: string) {
  queue.on("completed", (job: any, result: any, duration: number) => {
    jobDuration.labels(name).observe(duration / 1000);
  });
  queue.on("failed", (job: any, err: any) => {
    jobDuration.labels(name).observe(job.processedOn ? (Date.now() - job.processedOn) / 1000 : 0);
  });
}

attachMetrics(exportQueue, "export");
attachMetrics(deployQueue, "deploy");
attachMetrics(aiQueue, "ai");
