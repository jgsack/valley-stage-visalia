import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalizeHtml,
  classifyChange,
  fingerprintContent,
} from "../scripts/monitor-sources.mjs";

test("HTML fingerprints ignore scripts and formatting noise", () => {
  const first = `
    <html><head><title>Season</title><script>window.build = 1</script></head>
    <body><main><h1>Our Shows</h1><p>August 14 at 7:00 PM</p></main></body></html>`;
  const second = `<html><head><title>Season</title><script>window.build = 999</script></head>
    <body><main> <h1>Our Shows</h1> <p>August 14 at 7:00 PM</p> </main></body></html>`;

  assert.deepEqual(canonicalizeHtml(first), canonicalizeHtml(second));
  assert.equal(
    fingerprintContent(first, "text/html").contentHash,
    fingerprintContent(second, "text/html").contentHash,
  );
});

test("structured event changes are material", () => {
  const html = (date) => `<script type="application/ld+json">${JSON.stringify({
    "@type": "TheaterEvent",
    name: "Example Show",
    startDate: date,
  })}</script>`;

  assert.notEqual(
    fingerprintContent(html("2026-08-14T19:00:00-07:00"), "text/html").contentHash,
    fingerprintContent(html("2026-08-15T19:00:00-07:00"), "text/html").contentHash,
  );
});

test("change classification suppresses steady-state AI work", () => {
  const ok = { status: "ok", finalUrl: "https://example.com/shows", contentHash: "one" };
  const failed = { status: "failed", error: "HTTP 403" };

  assert.deepEqual(classifyChange(undefined, ok), { type: "baseline", requiresReview: false });
  assert.deepEqual(classifyChange(ok, ok), { type: "unchanged", requiresReview: false });
  assert.deepEqual(classifyChange(failed, failed), { type: "persistent_failure", requiresReview: false });
  assert.deepEqual(classifyChange(ok, { ...ok, contentHash: "two" }), {
    type: "content_changed",
    requiresReview: true,
  });
  assert.deepEqual(classifyChange(failed, ok), { type: "source_recovered", requiresReview: true });
});
