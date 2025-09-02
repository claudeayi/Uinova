import { exportQueue, deployQueue, aiQueue } from "../queues";

export class JobService {
  async enqueueExport(data: any) {
    return exportQueue.add("exportJob", data);
  }

  async enqueueDeploy(data: any) {
    return deployQueue.add("deployJob", data);
  }

  async enqueueAI(data: any) {
    return aiQueue.add("aiJob", data);
  }
}
