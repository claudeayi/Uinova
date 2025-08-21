import { Router } from "express"
const r = Router()

r.get("/", (_req, res) => res.json({ ok: true, uptime: process.uptime() }))
r.get("/ready", (_req, res) => res.sendStatus(200))

export default r
