import { Router } from "express";
import { authenticate } from "../middlewares/security";
import { JobService } from "../services/jobService";

const router = Router();
const jobs = new JobService();

router.use(authenticate);

/**
 * POST /api/jobs/export
 */
router.post("/export", async (req, res) => {
  try {
    const { projectId, target } = req.body;
    const job = await jobs.enqueueExport({ projectId, target, exportId: req.body.exportId });
    res.json({ jobId: job.id });
  } catch (err) {
    console.error("❌ Export job error:", err);
    res.status(500).json({ error: "Erreur création job export" });
  }
});

export default router;
