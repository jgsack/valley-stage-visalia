import { appendFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const snapshot = JSON.parse(readFileSync(resolve("data/pilot-snapshot.json"), "utf8"));
const current = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  month: "long",
  day: "numeric",
  year: "numeric",
}).format(new Date());
const needed = snapshot.checkedAt !== current || snapshot.reviewedAt !== current;

console.log(needed ? `Daily check is due for ${current}.` : `Daily check is already recorded for ${current}.`);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `needed=${needed}\n`);
}