import { appendFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const snapshot = JSON.parse(readFileSync(resolve("data/pilot-snapshot.json"), "utf8"));
const current = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  month: "long",
  day: "numeric",
  year: "numeric",
}).format(new Date());
let aiDay;
try { aiDay = JSON.parse(readFileSync(resolve("data/ai-refresh-report.json"), "utf8")).completedDay; } catch { /* First AI refresh is due. */ }
const currentDay = new Intl.DateTimeFormat("en-CA", {timeZone:"America/Los_Angeles",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const needed = snapshot.checkedAt !== current || snapshot.reviewedAt !== current || aiDay !== currentDay;

console.log(needed ? `Daily check is due for ${current}.` : `Daily check is already recorded for ${current}.`);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `needed=${needed}\n`);
}