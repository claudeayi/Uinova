import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";

import { exportQueue, deployQueue, aiQueue } from "../queues";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/api/admin/jobs");

// Création du dashboard Bull Board
createBullBoard({
  queues: [
    new BullMQAdapter(exportQueue),
    new BullMQAdapter(deployQueue),
    new BullMQAdapter(aiQueue),
  ],
  serverAdapter,
});

export { serverAdapter as bullBoardAdapter };
