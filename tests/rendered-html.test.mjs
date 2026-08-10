import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const snapshot = JSON.parse(
  readFileSync(new URL("../data/pilot-snapshot.json", import.meta.url), "utf8"),
);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the Valley Stage prototype", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Valley Stage \| Live theater near Visalia<\/title>/i);
  assert.match(html, /Annie/);
  assert.match(html, /\/posters\/roger-rockas-annie\.jpg/);
  assert.match(html, /class="poster-backdrop"/);
  assert.match(html, /class="poster-art"/);
  assert.match(html, /On the valley marquee/);
  assert.match(html, /Now playing &amp; coming soon/);
  assert.match(html, /class="marquee-track"/);
  assert.match(html, /Roger Rocka/);
  assert.match(
    html,
    new RegExp(`Playing now<span class="count">${snapshot.shows.filter((show) => show.status === "now").length}<\\/span>`),
  );
  assert.match(
    html,
    new RegExp(`${snapshot.sources.length}(?:<!-- -->)? sources\\. One stage door\\.`),
  );
  assert.match(html, /Lindsay Community Theater/);
  assert.match(html, /Fresno State Theatre Arts/);
  assert.match(html, /Kings Players/);
  assert.match(html, /TCOE Theatre Company/);
  assert.match(html, /COS Theatre Arts/);
  assert.match(html, />Contact<\/a>/);
  assert.match(html, /docs\.google\.com\/forms\/d\/e\/1FAIpQLSe1ZFD-/);
  assert.match(html, /og:image/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});
