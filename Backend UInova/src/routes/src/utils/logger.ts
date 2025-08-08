import fs from "fs";
const LOG_PATH = process.env.LOG_PATH || "uinova.log";

export function log(...args: any[]) {
  const msg = `[${new Date().toISOString()}] ` + args.join(" ");
  if (process.env.NODE_ENV !== "production") {
    console.log(msg);
  }
  fs.appendFileSync(LOG_PATH, msg + "\n");
}
