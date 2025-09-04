import { emailQueue } from "../queues";

interface EmailJob {
  to: string;
  subject: string;
  template: string;
  data?: Record<string, any>;
}

export async function enqueueEmail(job: EmailJob) {
  await emailQueue.add("sendEmail", job, { attempts: 3, backoff: 5000 });
}
