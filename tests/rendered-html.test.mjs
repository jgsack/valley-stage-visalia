import assert from "node:assert/strict";
import test from "node:test";

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
  assert.match(html, /Little Shop of Horrors/);
  assert.match(html, /A Year with Frog and Toad/);
  assert.match(html, /Seussical the Musical/);
  assert.match(html, /James and the Giant Peach/);
  assert.match(html, /\/posters\/encore-frog-and-toad\.jpg/);
  assert.match(html, /Roger Rocka/);
  assert.match(html, /Playing now<span class="count">1<\/span>/);
  assert.match(html, /Five sources\. One stage door\./);
  assert.match(html, /The Father/);
  assert.match(html, /COS Theatre Arts/);
  assert.match(html, /og:image/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});
