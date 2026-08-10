import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const snapshot = JSON.parse(readFileSync(resolve("data/pilot-snapshot.json"), "utf8"));
const monitor = JSON.parse(readFileSync(resolve("data/monitoring-sources.json"), "utf8"));
const sourceBaseline = JSON.parse(
  readFileSync(resolve("data/source-monitor-baseline.json"), "utf8"),
);

assert.equal(monitor.sources.length, 16, "the daily monitor must cover all 16 confirmed sources");
assert.equal(snapshot.sources.length, monitor.sources.length, "the site must show every monitored source");

const monitoredUrls = monitor.sources.flatMap((source) => source.officialUrls);
assert.equal(
  Object.keys(sourceBaseline.sources).length,
  monitoredUrls.length,
  "the deterministic baseline must cover every configured URL",
);
for (const url of monitoredUrls) {
  assert.ok(sourceBaseline.sources[url], `missing deterministic baseline: ${url}`);
}

const ids = new Set();
for (const show of snapshot.shows) {
  assert.ok(!ids.has(show.id), `duplicate listing id: ${show.id}`);
  ids.add(show.id);
  assert.ok(show.title && show.theater && show.city, `incomplete listing: ${show.id}`);
  assert.ok(["now", "soon", "auditions"].includes(show.status), `invalid status: ${show.id}`);
  assert.ok(show.distance <= snapshot.center.radiusMiles, `outside radius: ${show.id}`);
  assert.match(show.sourceUrl, /^https:\/\//, `missing official source: ${show.id}`);
  assert.match(show.detailsUrl, /^https:\/\//, `missing official details: ${show.id}`);
  if (show.image?.startsWith("/")) {
    assert.ok(existsSync(resolve("public", show.image.slice(1))), `missing poster: ${show.image}`);
  }
}

assert.ok(snapshot.shows.some((show) => show.status === "now"), "a current show is expected");
assert.ok(snapshot.shows.some((show) => show.status === "auditions"), "an audition is expected");

console.log(
  `Validated ${snapshot.shows.length} listings, ${snapshot.sources.length} sources, and local poster assets.`,
);
