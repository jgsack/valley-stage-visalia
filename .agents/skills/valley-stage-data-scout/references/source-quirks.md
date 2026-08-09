# Source quirks and recovery patterns

## General recovery sequence

When an official page returns 403, incomplete HTML, or misleading metadata:

1. Open the rendered page in a browser.
2. Inspect visible headings, links, images, and page assets.
3. Correlate a candidate asset with nearby production text, dates, captions, and page structure.
4. Export or download only the verified asset.
5. Inspect the saved file before adding it to the site.

Do not trust a filename, alt text, DOM order, or search snippet by itself. These are clues, not proof.

## Complete poster discovery ladder

Try these routes in order, stopping when a high-quality official image is verified:

1. **Visible production artwork:** Inspect the official production, season, calendar, and audition pages in a rendered browser.
2. **Related official pages:** Follow links to the individual show page, full-season page, official ticketing page, school or municipal page, and official social post. A homepage may omit artwork that appears on a deeper page.
3. **Image element variants:** Inspect `<img>`, `<picture>`, and `<source>` elements, including `srcset`, lazy-load attributes, and links around thumbnails. Choose the largest supplied variant of the same verified image.
4. **Page metadata:** Inspect Open Graph and social-card metadata such as `og:image` and `twitter:image`. Verify that the image describes the production rather than the theater's generic brand.
5. **Structured data:** Inspect JSON-LD and other embedded page data for production-specific `image`, event, or offer records. Reject generic organization logos.
6. **CSS artwork:** Inspect `background-image`, inline styles, and computed styles when the poster is displayed as a background rather than an image element.
7. **Embedded ticketing or widgets:** Inspect official ticketing frames and linked event pages. Match the organization, production title, and dates before accepting their artwork.
8. **Browser page assets:** Inspect the rendered page's loaded images or network assets when HTML is incomplete, JavaScript creates the page, or direct requests are blocked. Use dimensions and page context to narrow candidates, then inspect them visually.
9. **Official social media:** Open the organization's permanent post or media viewer and inspect the official attachment or its supplied high-resolution variant. Do not rely on comments, shares, or unofficial reposts as evidence.
10. **Official PDF or digital program:** Inspect season brochures and programs. Prefer extracting the embedded image; otherwise render the relevant page cleanly at high resolution.
11. **Screenshot recovery:** If an official poster is clearly rendered but the underlying asset cannot be downloaded, capture and crop the poster from the rendered page. Exclude browser controls, captions, reactions, and unrelated page material; preserve the complete artwork and readable text.

Never bypass a login, paywall, CAPTCHA, or access control. Search-engine thumbnails and snippets may locate an official page but are not final artwork sources.

## Read and validate poster text

- Use visual inspection first and OCR as an aid for small dates, times, titles, and venue text.
- Compare OCR output with the visible poster and another official page when characters are unclear; OCR is not proof by itself.
- Transcribe only legible facts. Do not infer a year, time, or performance date from a partial crop.
- Confirm that the title, organization, venue, and season align with the listing before accepting the image.

## Preserve the best verified asset

- Prefer the largest official variant actually supplied by the page, `srcset`, media viewer, document, or CDN. Do not invent undocumented URLs merely by changing dimensions or filenames.
- Confirm the downloaded file's real media type, dimensions, and contents; use the matching extension.
- Compare near-duplicates and keep the cleanest complete version without social-media controls or unrelated borders.
- Do not upscale a small image and call it higher resolution. Keep it if it remains the best verified official asset and let the site's `contain` presentation handle it.
- Save the final file under `public/posters/`, use a stable production-specific name, and avoid hotlinks whose URLs or access tokens may expire.

## Selma Arts Center

- Image files can have generic names such as `Copy_of_SAC...`.
- Alt text has sometimes described unrelated material, including `Chef of the Month`.
- Direct image requests may trigger Cloudflare even when the rendered production page works.
- Season and production posters may contain the most precise performance dates; verify the theater and title before transcribing them.

## Lindsay Community Theater

- The site uses Google Sites, and logo or navigation graphics may appear before the production artwork.
- A meaningful production image may occur later in the page asset list, but never select it solely by position.
- Gallery pages can contain several productions and historical images. Match each candidate to its local heading and current season context.
- If a direct Google-hosted asset returns 403, inspect or capture it through the rendered official page.
- After finding one missing show, audit sibling season, show, calendar, and audition pages; Lindsay may publish several posters separately.
- A page may combine performance dates and auditions. Keep these as separate normalized records.
- Official title artwork is acceptable when no conventional poster is available.

## College of the Sequoias

- A season announcement may exist primarily as a poster on the department's official Facebook page.
- Dates printed on that official season poster may be transcribed when legible and unambiguous.
- Retain the permanent official post as evidence until a more specific official production or ticket page is available.

## Encore Theatre

- Individual show pages often contain better posters and details than the general season or home page.
- Prefer the production page and its locally saved image after verifying dates against ticketing when available.

## Porterville Barn Theater and Reedley River City Theatre

- Reconcile general season announcements with individual production and ticket pages.
- A missing homepage card does not establish that a future production is absent; inspect the full season and ticket inventory.

## Official social media

- Use only an organization's official account or an official post it published.
- Save the permanent post URL as evidence when possible.
- Treat comments, shares, community calendars, and reposts only as leads to an official source.
- Do not embed a social feed merely to obtain artwork. Verify the media, save a local copy, and link users to the official source or details page.
