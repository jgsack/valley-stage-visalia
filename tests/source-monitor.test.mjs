import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSocialDiscoveryTasks,
  canonicalizeHtml,
  classifyChange,
  fingerprintContent,
} from "../scripts/monitor-sources.mjs";

test("official social accounts create mandatory daily discovery tasks", () => {
  const tasks = buildSocialDiscoveryTasks(
    {
      sources: [
        {
          id: "ice-house",
          name: "Ice House Theatre / Visalia Players",
          officialSocialAccounts: [
            {
              platform: "facebook",
              handle: "@visaliaplayers",
              url: "https://www.facebook.com/visaliaplayers/",
            },
          ],
          socialDiscoveryTerms: ["audition", "casting"],
        },
      ],
    },
    "2026-08-29T10:00:00.000Z",
  );

  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].organizationId, "ice-house");
  assert.equal(tasks[0].accountUrl, "https://www.facebook.com/visaliaplayers/");
  assert.match(tasks[0].searchQueries[0], /facebook\.com\/visaliaplayers/);
  assert.match(tasks[0].searchQueries[0], /audition/);
});

test("organizations without mapped accounts still create social account discovery tasks", () => {
  const tasks = buildSocialDiscoveryTasks(
    {
      sources: [
        {
          id: "unmapped-theater",
          name: "Unmapped Theater",
          officialUrls: ["https://example.com/events"],
        },
      ],
    },
    "2026-08-29T10:00:00.000Z",
  );

  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].discoveryMode, "account-discovery");
  assert.equal(tasks[0].accountUrl, null);
  assert.match(tasks[0].searchQueries[0], /site:facebook\.com OR site:instagram\.com/);
});

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
  const transientFailure = { status: "failed", error: "request timed out", consecutiveFailures: 1 };
  const confirmedFailure = { status: "failed", error: "HTTP 403", consecutiveFailures: 2 };

  assert.deepEqual(classifyChange(undefined, ok), { type: "baseline", requiresReview: false });
  assert.deepEqual(classifyChange(ok, ok), { type: "unchanged", requiresReview: false });
  assert.deepEqual(classifyChange(ok, transientFailure), {
    type: "transient_failure",
    requiresReview: false,
  });
  assert.deepEqual(classifyChange(transientFailure, confirmedFailure), {
    type: "source_failed",
    requiresReview: true,
  });
  assert.deepEqual(classifyChange(confirmedFailure, { ...confirmedFailure, consecutiveFailures: 3 }), {
    type: "persistent_failure",
    requiresReview: false,
  });
  assert.deepEqual(classifyChange(ok, { ...ok, contentHash: "two" }), {
    type: "content_changed",
    requiresReview: true,
  });
  assert.deepEqual(classifyChange(transientFailure, ok), {
    type: "transient_failure_recovered",
    requiresReview: false,
  });
  assert.deepEqual(classifyChange(confirmedFailure, ok), {
    type: "source_recovered",
    requiresReview: true,
  });
});
