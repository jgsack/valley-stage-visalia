# Automation-First Publishing Policy

The Visalia-area live-theater website is operated as a fully automated publication. Theater staff and visitors are not expected to upload posters, enter productions, maintain accounts, or approve routine listings.

## Product rule

AI agents and deterministic importers are responsible for discovering, extracting, verifying, illustrating, publishing, updating, and expiring all content.

An optional “What about this theater?” or “Report a correction” message only nominates a source for investigation. It does not publish content directly. Agents must independently verify the official source and apply the same publication rules used for every other listing.

## Automated source order

For each organization, agents check sources in this order:

1. Official production, season, and audition pages
2. Official calendar feeds, structured event data, RSS, and sitemaps
3. Official ticketing pages or permitted ticketing APIs
4. Official school or district calendars
5. Official social-media embeds or authorized APIs when the information is unavailable elsewhere
6. Credible secondary sources only as discovery leads, never as the sole authority for publication

## Automated production pipeline

1. **Discover:** Find new season, production, performance, and audition URLs from the registered sources.
2. **Extract:** Collect titles, dates, times, venues, ticket links, descriptions, prices, audition requirements, and media candidates.
3. **Normalize:** Convert dates and locations into the site schema and distinguish a production run from its individual performances.
4. **Deduplicate:** Merge repeated listings from the theater, ticket seller, calendar, and social sources.
5. **Verify:** Confirm that the source is official, dates are internally consistent, the venue belongs inside the configured radius, and the event is live theater or an allowed adjacent category.
6. **Select media:** Choose the best eligible production image using the rules below.
7. **Publish:** Publish automatically only when the confidence threshold is met.
8. **Monitor:** Recheck for cancellations, extensions, venue changes, new performances, and audition deadlines. After every successful complete check, advance `checkedAt` in `data/pilot-snapshot.json` to the current America/Los_Angeles date, even when no listings changed. Keep `verifiedAt` at the date of the latest material listing change. Validate, commit, and publish the new check date so visitors can distinguish a successful no-change run from a missed run.
9. **Expire:** Remove past items from current views while preserving their history for deduplication and auditing.

Low-confidence items remain unpublished. Agents retry alternate official sources and re-evaluate them later; routine publication does not depend on a human review queue.

## Automated poster and image selection

Images are acquired from the production’s official web presence without asking the theater to upload anything.

Candidate priority:

1. Schema.org `Event.image` or `TheaterEvent.image`
2. The production page’s `og:image`
3. An image supplied by an allowed ticketing API or ticket page
4. A prominent in-page poster associated with the production title
5. An official social-media post embed
6. The organization logo or an automatically generated neutral placeholder

The media agent scores candidates using:

- Source authority
- Proximity to the production title and dates
- Image dimensions and aspect ratio
- Legible show title
- Whether the image is a poster rather than a navigation graphic, advertisement, or unrelated photograph
- Match between words visible in the image and the extracted production record
- Reuse permissions associated with the source type

The selected image never supplies the only copy of a date or venue. Textual event information must still be extracted and validated separately so it remains searchable and accessible.

## Media provenance and use

Every visual record stores:

- Original page URL
- Original image or embed URL
- Theater or ticketing source
- Retrieval time and content hash
- Detected title and associated production ID
- Media-use mode
- Credit or attribution when available
- Last successful availability check

Supported media-use modes are:

- `official_embed`: displayed through the source platform’s supported embed
- `licensed_api`: supplied by an API whose terms permit the intended display
- `remote_preview`: used as a source-attributed link preview without creating a permanent archive
- `cached_copy`: used only when the source terms or explicit standing permission allow local caching
- `generated_placeholder`: original neutral artwork used when no eligible production image is available

Agents do not scrape Facebook or Instagram page markup. Social material is used only through official embeds or authorized APIs.

## Automatic publication gate

A production can publish when all required conditions pass:

- Official or otherwise approved source
- Production title
- Producing organization
- At least one future performance, or a current run with a remaining performance
- Verified venue or a clearly identified venue awaiting geocoding
- Source URL
- No unresolved conflict between authoritative dates

An image is desirable but not required. Failure to find eligible artwork results in a branded placeholder, not a blocked production listing.

## Corrections and missing theaters

The public site may offer two lightweight reports:

- “What about this theater?” with a name and optional URL
- “Report incorrect information” on a listing

Each report starts an agent investigation. The reporter does not edit the site, and the report is not treated as authoritative data.
