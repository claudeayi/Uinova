// src/utils/logger.ts
import fs from "fs";
import path from "path";

const LOG_PATH = process.env.LOG_PATH || "uinova.log";
const MAX_LOG_SIZE = Number(process.env.MAX_LOG_SIZE) || 5 * 1024 * 1024; // 5 Mo par défaut
const JSON_LOGS = process.env.JSON_LOGS === "true";

/**
 * Écrit un message dans le fichier de log (et console si dev)
 */
function writeLog(level: string, message: string, meta?: any) {
  const timestamp = new Date().toISOString();
  let logEntry: string;

  if (JSON_LOGS) {
    logEntry = JSON.stringify({ timestamp, level, message, meta }) + "\n";
  } else {
    logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message} ${meta ? JSON.stringify(meta) : ""}\n`;
  }

  // Affichage console si pas en prod
  if (process.env.NODE_ENV !== "production") {
    process.stdout.write(logEntry);
  }

  // Rotation simple si le fichier est trop gros
  try {
    if (fs.existsSync(LOG_PATH) && fs.statSync(LOG_PATH).size > MAX_LOG_SIZE) {
      const backupPath = path.join(
        path.dirname(LOG_PATH),
        `${path.basename(LOG_PATH, ".log")}-${Date.now()}.log`
      );
      fs.renameSync(LOG_PATH, backupPath);
    }
  } catch (err) {
    console.error("Erreur lors de la rotation du log:", err);
  }

  fs.appendFileSync(LOG_PATH, logEntry, { encoding: "utf-8" });
}

/**
 * Niveaux de log
 */
export const logger = {
  info: (msg: string, meta?: any) => writeLog("info", msg, meta),
  warn: (msg: string, meta?: any) => writeLog("warn", msg, meta),
  error: (msg: string, meta?: any) => writeLog("error", msg, meta),
  debug: (msg: string, meta?: any) => writeLog("debug", msg, meta),
};
