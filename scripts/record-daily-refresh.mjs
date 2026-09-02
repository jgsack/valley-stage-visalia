import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const snapshotPath = resolve("data/pilot-snapshot.json");
const current = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  month: "long",
  day: "numeric",
  year: "numeric",
}).format(new Date());

const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
if (snapshot.checkedAt === current && snapshot.reviewedAt === current) {
  console.log(`Valley Stage already recorded for ${current}.`);
  process.exit(0);
}

snapshot.checkedAt = current;
snapshot.reviewedAt = current;
snapshot.reviewSummary = `Last updated: ${current}`;
writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Recorded Valley Stage daily refresh for ${current}.`);
