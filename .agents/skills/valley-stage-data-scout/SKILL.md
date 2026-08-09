---
name: valley-stage-data-scout
description: Find, verify, normalize, and maintain live-theater productions, performance dates, auditions, official artwork, and source links for the Valley Stage website around Visalia, California. Use for theater-source audits, scheduled listing refreshes, missing or incorrect shows, poster discovery, date or time corrections, audition updates, new nearby theater coverage, and edits to data/pilot-snapshot.json or data/monitoring-sources.json.
---

# Valley Stage Data Scout

Maintain a trustworthy, fully automated guide to live theater within the site's configured radius of Visalia, California. Prefer a smaller set of verified listings over attractive but uncertain information.

## Start with project truth

1. Read `data/monitoring-sources.json` to learn the monitored organizations, URLs, aliases, and radius.
2. Read `data/pilot-snapshot.json` to understand the current normalized records and avoid accidental regressions.
3. Read `app/theater-explorer.tsx` only when the request concerns display behavior or fields consumed by the interface.
4. Preserve the configured geographic radius unless the user asks to change it.
5. Treat a user's report of a missing production or poster as a strong lead, then verify it against an official source.

## Delegate broad audits

For audits covering four or more independent theaters, delegate nonoverlapping source groups to subagents when concurrency is available.

- Give each subagent a bounded list of organizations and ask for candidate records, evidence URLs, and image candidates.
- Keep subagents read-only: they must not edit shared files, download assets, commit, push, or publish.
- Have the main agent reconcile all findings, validate them, write shared files once, and publish if requested.
- Stay single-agent for one or two focused corrections.

## Search sources in priority order

Use sources in this order:

1. Official production, season, calendar, or audition page.
2. Official ticketing page linked by the organization.
3. Official school, college, university, or municipal arts page.
4. Official social-media account or post.
5. Search results only to discover a stronger primary source.

Do not include an organization merely because it exists. Unless the user explicitly asks to retain it, require at least one current production, upcoming production, or active audition listing.

## Extract complete records

For each production, capture and verify the fields used by the current data schema:

- `id`
- `title`
- `theater`
- `city`
- `distance`
- `run`
- `next`
- `performanceCount`
- `description`
- `status`
- `sourceUrl`
- `detailsUrl`
- optional `image`, `imageMode`, and `featured`

Keep auditions as distinct records with audition dates, requirements, and an audition-oriented `next` label. Do not describe an audition as a performance.

## Normalize dates carefully

- Interpret dates in `America/Los_Angeles` and compare them with the actual current date.
- Verify day-of-week labels programmatically whenever possible.
- Accept dates printed on an official poster when the production and organization are unambiguous.
- Include a performance time only when an official source supplies one.
- Omit the time entirely when it is unknown; never display `time pending`.
- Use `Exact dates pending` only when the official source has announced the production but has not published dates.
- Use `Tonight` only when a verified performance occurs on the actual current date.
- Mark `status: now` only while the run is active; otherwise use the appropriate upcoming or audition status.
- During a complete refresh, remove expired events unless the application intentionally retains an archive.

## Find and preserve official artwork

1. Inspect the rendered official page first.
2. Inspect image elements and page assets when the visible page does not expose a downloadable poster.
3. Correlate the image with the production title, nearby headings, dates, captions, and official page context.
4. Visually inspect the candidate before using it.
5. Reject logos, ratings icons, unrelated gallery images, and ambiguous artwork.
6. Prefer an official poster or title treatment. An official production photo is acceptable when no poster exists and its association is clear.
7. Save verified artwork locally under `public/posters/` with the correct file extension; do not hotlink it.
8. Use `imageMode: contain` for posters and title artwork. Use `cover` only for photography that can be safely cropped.
9. If no candidate can be verified, omit the image rather than inventing or guessing.

Read [source-quirks.md](references/source-quirks.md) when a page is blocked, image labels are misleading, or the only evidence is on social media.

## Reconcile before editing

- Maintain source-filter aliases so every listing appears when its organization is selected.
- Deduplicate the same production when a season page, production page, and ticket page all describe it.
- Prefer the most specific stable official URL for `detailsUrl`; retain the broader source page when useful for provenance.
- After finding one omission, audit sibling season, production, calendar, and audition pages for related omissions.
- Preserve unrelated user changes in the worktree.

## Validate and publish

Before committing:

1. Parse every changed JSON file.
2. Confirm each local image path exists and visually inspect newly saved artwork.
3. Search changed content for filler such as `time pending`, stale `Tonight` labels, and performance wording on auditions.
4. Run the project's build or closest available validation command.
5. Review the diff for accidental deletions, duplicates, and unrelated edits.

Use the project's Sites workflows for public website changes. Commit and push the exact verified source changes so the same workflow is available from another computer. Report what was added or corrected, identify uncertain findings that were deliberately withheld, and state whether the public site was published.

Never publish an uncertain fact as settled. When official sources conflict, retain the last clearly verified value only if it is still plausible and report the conflict for follow-up.
