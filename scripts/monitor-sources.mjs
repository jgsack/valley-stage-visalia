import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const STATE_VERSION = 1;
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_CONCURRENCY = 6;
const FAILURE_REVIEW_THRESHOLD = 2;

function parseArgs(argv) {
  const args = {
    state: ".cache/source-monitor-state.json",
    report: "source-monitor-report.json",
    markdown: "source-monitor-report.md",
    timeoutMs: DEFAULT_TIMEOUT_MS,
    concurrency: DEFAULT_CONCURRENCY,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === "--state") args.state = value;
    else if (argument === "--report") args.report = value;
    else if (argument === "--markdown") args.markdown = value;
    else if (argument === "--timeout-ms") args.timeoutMs = Number(value);
    else if (argument === "--concurrency") args.concurrency = Number(value);
    else if (argument === "--github-output") args.githubOutput = value;
    else continue;
    index += 1;
  }

  if (!Number.isInteger(args.timeoutMs) || args.timeoutMs < 1_000) {
    throw new Error("--timeout-ms must be an integer of at least 1000");
  }
  if (!Number.isInteger(args.concurrency) || args.concurrency < 1 || args.concurrency > 20) {
    throw new Error("--concurrency must be an integer between 1 and 20");
  }
  return args;
}

function decodeEntities(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    ldquo: "“",
    lsquo: "‘",
    lt: "<",
    mdash: "—",
    middot: "·",
    nbsp: " ",
    ndash: "–",
    quot: '"',
    rdquo: "”",
    rsquo: "’",
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return named[entity.toLowerCase()] ?? match;
  });
}

function normalizeText(value) {
  return decodeEntities(value)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

function collectEvents(value, events) {
  if (Array.isArray(value)) {
    for (const child of value) collectEvents(child, events);
    return;
  }
  if (!value || typeof value !== "object") return;

  const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
  if (types.some((type) => ["Event", "TheaterEvent"].includes(type))) {
    const location = typeof value.location === "object" ? value.location : {};
    const offers = Array.isArray(value.offers) ? value.offers[0] : value.offers;
    events.push(
      stableValue({
        name: value.name ?? null,
        startDate: value.startDate ?? null,
        endDate: value.endDate ?? null,
        eventStatus: value.eventStatus ?? null,
        url: value.url ?? null,
        location: location?.name ?? location?.address ?? value.location ?? null,
        image: value.image ?? null,
        ticketUrl: offers?.url ?? null,
        availability: offers?.availability ?? null,
      }),
    );
  }

  for (const child of Object.values(value)) collectEvents(child, events);
}

function extractMeta(html, key) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const property = tag.match(/(?:name|property)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (property?.toLowerCase() !== key.toLowerCase()) continue;
    return tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
  }
  return "";
}

export function canonicalizeHtml(html) {
  const events = [];
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      collectEvents(JSON.parse(decodeEntities(match[1].trim())), events);
    } catch {
      // Invalid structured data is common; visible source signals still get monitored.
    }
  }

  const title = normalizeText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const description = normalizeText(
    extractMeta(html, "description") || extractMeta(html, "og:description"),
  );
  const visible = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|hr)\b[^>]*>/gi, "\n")
    .replace(/<\/(address|article|aside|blockquote|div|dl|fieldset|footer|form|h[1-6]|header|li|main|nav|ol|p|section|table|tr|ul)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  const datePattern = /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b|\b\d{1,2}[-/]\d{1,2}(?:[-/]\d{2,4})?\b|\b\d{1,2}:\d{2}\s*(?:am|pm)\b/i;
  const theaterPattern = /\b(?:audition|box office|calendar|cast|event|matinee|musical|on stage|performance|play|production|season|show|theatre|theater|ticket)\w*\b/i;
  const signals = normalizeText(visible)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length >= 6 && line.length <= 1_000)
    .filter((line) => datePattern.test(line) || theaterPattern.test(line))
    .map((line) => line.replace(/\s+/g, " "));

  return stableValue({
    title,
    description,
    events: events.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
    signals: [...new Set(signals)].sort().slice(0, 750),
  });
}

function canonicalizeCalendar(value) {
  return normalizeText(value)
    .split("\n")
    .filter((line) => /^(BEGIN|END|SUMMARY|DESCRIPTION|DTSTART|DTEND|LOCATION|URL|STATUS|RECURRENCE-ID)/i.test(line))
    .join("\n");
}

export function fingerprintContent(content, contentType = "text/html") {
  let canonical;
  if (/html/i.test(contentType)) canonical = canonicalizeHtml(content);
  else if (/calendar|ics/i.test(contentType)) canonical = canonicalizeCalendar(content);
  else if (/json/i.test(contentType)) {
    try {
      canonical = stableValue(JSON.parse(content));
    } catch {
      canonical = normalizeText(content);
    }
  } else canonical = normalizeText(content);

  const serialized = typeof canonical === "string" ? canonical : JSON.stringify(canonical);
  return {
    contentHash: createHash("sha256").update(serialized).digest("hex"),
    signalCount: Array.isArray(canonical?.signals) ? canonical.signals.length : null,
    eventCount: Array.isArray(canonical?.events) ? canonical.events.length : null,
  };
}

function simplifyError(error) {
  if (error?.name === "TimeoutError" || error?.name === "AbortError") return "request timed out";
  return String(error?.message ?? error).replace(/\s+/g, " ").slice(0, 240);
}

async function checkUrl(url, previous, timeoutMs, checkedAt) {
  const headers = {
    accept: "text/html,application/ld+json,application/json,text/calendar,application/xml;q=0.9,*/*;q=0.8",
    "user-agent": "ValleyStageSourceMonitor/1.0 (+https://valley-stage-visalia.vidspfx.chatgpt.site/)",
  };
  if (previous?.etag) headers["if-none-match"] = previous.etag;
  if (previous?.lastModified) headers["if-modified-since"] = previous.lastModified;

  try {
    const response = await fetch(url, {
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 304 && previous?.contentHash) {
      return {
        ...previous,
        checkedAt,
        consecutiveFailures: 0,
        httpStatus: 304,
        status: "ok",
      };
    }
    if (!response.ok) {
      return {
        status: "failed",
        checkedAt,
        finalUrl: response.url || url,
        httpStatus: response.status,
        error: `HTTP ${response.status}`,
        consecutiveFailures: (previous?.consecutiveFailures ?? 0) + 1,
      };
    }

    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    const content = await response.text();
    const fingerprint = fingerprintContent(content, contentType);
    return {
      status: "ok",
      checkedAt,
      finalUrl: response.url || url,
      httpStatus: response.status,
      contentType: contentType.split(";", 1)[0],
      contentLength: Buffer.byteLength(content),
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
      consecutiveFailures: 0,
      ...fingerprint,
    };
  } catch (error) {
    return {
      status: "failed",
      checkedAt,
      finalUrl: previous?.finalUrl ?? url,
      httpStatus: null,
      error: simplifyError(error),
      consecutiveFailures: (previous?.consecutiveFailures ?? 0) + 1,
    };
  }
}

export function classifyChange(previous, current) {
  if (!previous) return { type: "baseline", requiresReview: false };
  if (current.status === "failed") {
    if (current.consecutiveFailures === FAILURE_REVIEW_THRESHOLD) {
      return { type: "source_failed", requiresReview: true };
    }
    return {
      type: current.consecutiveFailures < FAILURE_REVIEW_THRESHOLD ? "transient_failure" : "persistent_failure",
      requiresReview: false,
    };
  }
  if (previous.status === "failed") {
    const wasReported = previous.consecutiveFailures >= FAILURE_REVIEW_THRESHOLD;
    return {
      type: wasReported ? "source_recovered" : "transient_failure_recovered",
      requiresReview: wasReported,
    };
  }
  if (previous.finalUrl && previous.finalUrl !== current.finalUrl) {
    return { type: "redirect_changed", requiresReview: true };
  }
  if (previous.contentHash !== current.contentHash) {
    return { type: "content_changed", requiresReview: true };
  }
  return { type: "unchanged", requiresReview: false };
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function loadState(path) {
  try {
    const state = JSON.parse(readFileSync(path, "utf8"));
    return state.version === STATE_VERSION ? state : { version: STATE_VERSION, sources: {} };
  } catch (error) {
    if (error?.code === "ENOENT") return { version: STATE_VERSION, sources: {} };
    throw error;
  }
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function makeMarkdown(report) {
  const lines = [
    "# Valley Stage source-monitor report",
    "",
    `Checked **${report.summary.checked} URLs** across **${report.summary.organizations} organizations** at ${report.checkedAt}.`,
    "",
    `- Review signals: **${report.summary.reviewSignals}**`,
    `- Reachable: **${report.summary.reachable}**`,
    `- Unreachable: **${report.summary.unreachable}**`,
    "",
  ];
  if (report.changes.length === 0) {
    lines.push("No source transition or material event signal changed.", "");
  } else {
    lines.push("## Signals requiring review", "");
    for (const change of report.changes) {
      lines.push(`- **${change.organization}** — ${change.type.replaceAll("_", " ")} — ${change.url}`);
      if (change.error) lines.push(`  - ${change.error}`);
      if (change.finalUrl && change.finalUrl !== change.url) lines.push(`  - Final URL: ${change.finalUrl}`);
    }
    lines.push("", "These signals are leads, not publishable facts. Verify them against the official page before changing listings.", "");
  }
  return `${lines.join("\n")}\n`;
}

export async function runMonitor(options) {
  const monitorPath = resolve("data/monitoring-sources.json");
  const monitor = JSON.parse(readFileSync(monitorPath, "utf8"));
  const previousState = loadState(resolve(options.state));
  const checkedAt = new Date().toISOString();
  const feeds = monitor.sources.flatMap((source) =>
    source.officialUrls.map((url) => ({ organizationId: source.id, organization: source.name, url })),
  );

  const checks = await mapWithConcurrency(feeds, options.concurrency, async (feed) => {
    const previous = previousState.sources[feed.url];
    const current = await checkUrl(feed.url, previous, options.timeoutMs, checkedAt);
    const change = classifyChange(previous, current);
    return { ...feed, previous, current, change };
  });

  const nextSources = Object.fromEntries(checks.map((check) => [check.url, check.current]));
  const configuredUrls = new Set(feeds.map((feed) => feed.url));
  const removed = Object.keys(previousState.sources)
    .filter((url) => !configuredUrls.has(url))
    .map((url) => ({
      organization: "Configuration",
      organizationId: null,
      url,
      type: "source_removed",
      requiresReview: true,
    }));

  const changes = checks
    .filter((check) => check.change.requiresReview)
    .map((check) => ({
      organization: check.organization,
      organizationId: check.organizationId,
      url: check.url,
      type: check.change.type,
      finalUrl: check.current.finalUrl,
      httpStatus: check.current.httpStatus,
      error: check.current.error ?? null,
      previousHash: check.previous?.contentHash ?? null,
      currentHash: check.current.contentHash ?? null,
    }))
    .concat(removed);

  const report = {
    version: STATE_VERSION,
    checkedAt,
    requiresReview: changes.length > 0,
    summary: {
      organizations: monitor.sources.length,
      checked: checks.length,
      reachable: checks.filter((check) => check.current.status === "ok").length,
      unreachable: checks.filter((check) => check.current.status === "failed").length,
      reviewSignals: changes.length,
      baselined: checks.filter((check) => check.change.type === "baseline").length,
      unchanged: checks.filter((check) =>
        ["unchanged", "transient_failure", "persistent_failure", "transient_failure_recovered"].includes(
          check.change.type,
        ),
      ).length,
    },
    changes,
  };

  writeJson(resolve(options.state), { version: STATE_VERSION, checkedAt, sources: nextSources });
  writeJson(resolve(options.report), report);
  const markdownPath = resolve(options.markdown);
  mkdirSync(dirname(markdownPath), { recursive: true });
  writeFileSync(markdownPath, makeMarkdown(report), "utf8");
  if (options.githubOutput) {
    appendFileSync(options.githubOutput, `requires_review=${report.requiresReview}\n`, "utf8");
    appendFileSync(options.githubOutput, `review_signals=${changes.length}\n`, "utf8");
  }
  return report;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = await runMonitor(options);
  console.log(
    `Checked ${report.summary.checked} URLs: ${report.summary.reachable} reachable, ${report.summary.unreachable} unreachable, ${report.summary.reviewSignals} review signals.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
