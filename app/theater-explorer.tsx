"use client";

import { useMemo, useState } from "react";
import snapshot from "../data/pilot-snapshot.json";

type ViewMode = "now" | "soon" | "auditions";

type Show = {
  id: string;
  title: string;
  theater: string;
  city: string;
  distance: number;
  run: string;
  next: string;
  performanceCount: string;
  description: string;
  status: ViewMode;
  sourceUrl: string;
  detailsUrl: string;
  image?: string;
  imageMode?: "cover" | "contain";
  featured?: boolean;
};

const shows = snapshot.shows as Show[];

const monthNumbers: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

function showStartTime(show: Show) {
  const monthMatch = show.run.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i,
  );
  const explicitYear = show.run.match(/\b(20\d{2})\b/)?.[1];
  const year = explicitYear ? Number(explicitYear) : 2026;

  if (monthMatch) {
    const month = monthNumbers[monthMatch[1].toLowerCase()];
    const remainder = show.run.slice((monthMatch.index ?? 0) + monthMatch[0].length);
    const day = Number(remainder.match(/\d{1,2}/)?.[0] ?? 1);
    return Date.UTC(year, month, day);
  }

  if (/spring/i.test(show.run)) return Date.UTC(year, 2, 1);
  if (/summer/i.test(show.run)) return Date.UTC(year, 5, 1);
  if (explicitYear) return Date.UTC(year, 11, 31);
  return Number.POSITIVE_INFINITY;
}

function byStartDate(a: Show, b: Show) {
  return showStartTime(a) - showStartTime(b) || a.title.localeCompare(b.title);
}

const marqueeShows = [
  ...shows.filter((show) => show.status === "now" && show.image),
  ...shows.filter((show) => show.status === "soon" && show.image).sort(byStartDate),
].slice(0, 12);

const contactFormUrl =
  "https://docs.google.com/forms/d/e/1FAIpQLSe1ZFD-xNR7gG-3wkzXmFDjMXf2q0ruceq7nsUE-5HVVjsO4A/viewform";

const sourceAliases: Record<string, string[]> = {
  "Ice House Theatre": ["Ice House Theatre"],
  "Encore Theatre": ["Encore Theatre"],
  "Lindsay Community Theater": ["Lindsay Community Theater"],
  "Porterville Barn Theater": ["Porterville Barn Theater"],
  "Reedley River City Theatre": ["Reedley's River City Theatre"],
  "Selma Arts Center": ["Selma Arts Center"],
  "Roger Rocka's / GCP": ["Roger Rocka's", "Good Company Players"],
  "Saroyan Theatre": ["Saroyan Theatre"],
  "COS Theatre Arts": ["College of the Sequoias"],
  "Fresno State Theatre Arts": ["Fresno State Theatre Arts"],
  "Redwood High School": ["Redwood High School"],
  "Mt. Whitney High School": ["Mt. Whitney High School"],
  "Golden West High School": ["Golden West High School"],
  "El Diamante High School": ["El Diamante High School"],
  "Kings Players": ["Kings Players"],
  "TCOE Theatre Company": ["TCOE Theatre Company"],
};

function matchesSource(show: Show, sourceName: string) {
  const aliases = sourceAliases[sourceName] ?? [sourceName];
  return aliases.some((alias) =>
    show.theater.toLowerCase().includes(alias.toLowerCase()),
  );
}

export function TheaterExplorer() {
  const [view, setView] = useState<ViewMode>(
    shows.some((show) => show.status === "now") ? "now" : "soon",
  );
  const [radius, setRadius] = useState(50);
  const [query, setQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  const searchQuery = query.trim();
  const isSearching = searchQuery.length > 0;

  const sourceFilteredShows = useMemo(
    () =>
      selectedSource
        ? shows.filter((show) => matchesSource(show, selectedSource))
        : shows,
    [selectedSource],
  );

  const visibleShows = useMemo(() => {
    const needle = searchQuery.toLowerCase();

    if (needle) {
      return shows.filter((show) => {
        const searchableText = [
          show.title,
          show.theater,
          show.city,
          show.description,
          show.run,
        ]
          .join(" ")
          .toLowerCase();

        return show.distance <= radius && searchableText.includes(needle);
      });
    }

    const filtered = sourceFilteredShows.filter(
      (show) => show.status === view && show.distance <= radius,
    );

    return view === "soon" || view === "auditions"
      ? filtered.toSorted(byStartDate)
      : filtered;
  }, [radius, searchQuery, sourceFilteredShows, view]);

  const viewCounts: Record<ViewMode, number> = {
    now: sourceFilteredShows.filter((show) => show.status === "now").length,
    soon: sourceFilteredShows.filter((show) => show.status === "soon").length,
    auditions: sourceFilteredShows.filter((show) => show.status === "auditions").length,
  };

  function showSourceListings(sourceName: string) {
    const matchingShows = shows.filter((show) => matchesSource(show, sourceName));
    const preferredView = (["now", "soon", "auditions"] as ViewMode[]).find(
      (mode) => matchingShows.some((show) => show.status === mode),
    );

    setSelectedSource(sourceName);
    setView(preferredView ?? "soon");
    setQuery("");
    setRadius(50);

    requestAnimationFrame(() => {
      document.getElementById("shows")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Valley Stage home">
          <span className="brand-mark" aria-hidden="true">V</span>
          <span className="brand-copy">
            <strong>Valley Stage</strong>
            <span>Visalia · California</span>
          </span>
        </a>
        <nav className="topnav" aria-label="Primary navigation">
          <a href="#shows">Shows</a>
          <a href="#sources">Theaters</a>
          <span className="live-indicator">Agents watching</span>
        </nav>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">Live theater within 50 miles</p>
          <h1>Find your next <em>curtain call.</em></h1>
        </div>
        <div className="hero-copy">
          <p>
            One clear view of what is playing, what is coming, and where the
            next audition opens around Visalia.
          </p>
          <div className="scan-note">
            Sources checked {snapshot.checkedAt} · latest listing changes {snapshot.verifiedAt}
            {" · "}next check daily at 3 AM
          </div>
        </div>
      </section>

      {marqueeShows.length > 0 ? (
        <section className="marquee-section" aria-labelledby="marquee-title">
          <div className="marquee-heading">
            <div>
              <p className="eyebrow">On the valley marquee</p>
              <h2 id="marquee-title">Now playing &amp; coming soon</h2>
            </div>
            <a href="#shows">See all listings <span aria-hidden="true">↓</span></a>
          </div>

          <div className="marquee-window">
            <div className="marquee-track">
              {[...marqueeShows, ...marqueeShows].map((show, index) => {
                const isDuplicate = index >= marqueeShows.length;

                return (
                  <a
                    aria-hidden={isDuplicate || undefined}
                    className="marquee-card"
                    href={show.detailsUrl}
                    key={`${show.id}-${index}`}
                    rel="noreferrer"
                    tabIndex={isDuplicate ? -1 : undefined}
                    target="_blank"
                  >
                    <div className="marquee-poster">
                      <img
                        alt=""
                        aria-hidden="true"
                        className="marquee-backdrop"
                        src={show.image}
                      />
                      <img
                        alt={`${show.title} promotional artwork`}
                        className="marquee-art"
                        src={show.image}
                      />
                      <span className={`marquee-badge ${show.status}`}>
                        {show.status === "now" ? "Playing now" : "Coming soon"}
                      </span>
                    </div>
                    <div className="marquee-copy">
                      <strong>{show.title}</strong>
                      <span>{show.theater}</span>
                      <small>{show.run}</small>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <section className="explorer" id="shows" aria-label="Theater listings">
        <div className="controls">
          <div className="tabs" role="tablist" aria-label="Listing type">
            {([ ["now", "Playing now"], ["soon", "Coming soon"], ["auditions", "Auditions"] ] as const).map(
              ([key, label]) => (
                <button
                  className={`tab ${view === key ? "active" : ""}`}
                  key={key}
                  onClick={() => {
                    setView(key);
                    setQuery("");
                  }}
                  role="tab"
                  aria-selected={view === key}
                  type="button"
                >
                  {label}<span className="count">{viewCounts[key]}</span>
                </button>
              ),
            )}
          </div>

          <label className="search-wrap">
            <span className="sr-only">Search shows or theaters</span>
            <input
              className="search-input"
              onChange={(event) => {
                setQuery(event.target.value);
                if (event.target.value.trim()) setSelectedSource(null);
              }}
              placeholder="Search all shows or theaters"
              type="search"
              value={query}
            />
          </label>

          <div className="radius-filter" aria-label="Distance from Visalia">
            {[15, 30, 50].map((miles) => (
              <button
                className={`radius-button ${radius === miles ? "active" : ""}`}
                key={miles}
                onClick={() => setRadius(miles)}
                type="button"
                aria-pressed={radius === miles}
              >
                {miles} mi
              </button>
            ))}
          </div>
        </div>

        {isSearching ? (
          <div className="source-filter-bar" role="status">
            <span>
              <strong>{visibleShows.length}</strong> {visibleShows.length === 1 ? "result" : "results"} for <strong>“{searchQuery}”</strong> across all listings
            </span>
            <button type="button" onClick={() => setQuery("")}>
              Clear search
            </button>
          </div>
        ) : selectedSource ? (
          <div className="source-filter-bar" role="status">
            <span>Showing listings from <strong>{selectedSource}</strong></span>
            <button type="button" onClick={() => setSelectedSource(null)}>
              Show all theaters
            </button>
          </div>
        ) : null}

        <div className="show-grid" aria-live="polite">
          {visibleShows.length ? (
            visibleShows.map((show, index) => (
              <article
                className={`show-card ${show.featured && index < 2 ? "featured" : ""}`}
                key={show.id}
              >
                <div className="poster">
                  <span className="date-flag">{show.run}</span>
                  {show.image ? (
                    <>
                      {/* The blurred copy fills the frame; the foreground preserves every edge of the poster. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="poster-backdrop" src={show.image} alt="" aria-hidden="true" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="poster-art" src={show.image} alt={`${show.title} promotional artwork`} />
                    </>
                  ) : (
                    <div className="poster-placeholder" aria-label={`${show.title} poster placeholder`}>
                      <small>Poster pending</small>
                      <strong>{show.title}</strong>
                    </div>
                  )}
                </div>
                <div className="card-copy">
                  <p className="theater-line">{show.theater} · {show.city}</p>
                  <h2>{show.title}</h2>
                  <p className="description">{show.description}</p>
                  <ul className="details-list" aria-label="Production details">
                    <li>
                      <span>{show.status === "auditions" ? "Next audition" : "Next performance"}</span>
                      <strong>{show.next}</strong>
                    </li>
                    <li>
                      <span>{show.status === "auditions" ? "Audition type" : "Run"}</span>
                      <strong>{show.performanceCount}</strong>
                    </li>
                    <li>
                      <span>{show.city === "Visalia" ? "Location" : "From Visalia"}</span>
                      <strong>
                        {show.city === "Visalia" ? "In Visalia" : `${show.distance} miles`}
                      </strong>
                    </li>
                  </ul>
                  <div className="card-actions">
                    <a className="primary-link" href={show.detailsUrl} target="_blank" rel="noreferrer">
                      Official details ↗
                    </a>
                    <a className="source-link" href={show.sourceUrl} target="_blank" rel="noreferrer">
                      View source
                    </a>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <strong>
                {selectedSource && !sourceFilteredShows.length
                  ? `No published listings for ${selectedSource}`
                  : isSearching
                  ? "No matching listings"
                  : view === "now"
                    ? "No shows playing today"
                    : view === "soon"
                      ? "No upcoming shows detected"
                      : "No open auditions detected"}
              </strong>
              <p>
                {selectedSource && !sourceFilteredShows.length
                  ? "This source is still being monitored. Its next confirmed production will appear here automatically."
                  : isSearching
                  ? "Try another title or theater, or choose a wider radius. Search checks playing, upcoming, and audition listings together."
                  : "The agents are still watching every registered official source and will publish the next verified update automatically."}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="source-section" id="sources">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Expanded daily monitor</p>
            <h2>{snapshot.sources.length} sources. One stage door.</h2>
          </div>
          <p>Checked daily. No uploads or manual event entry.</p>
        </div>
        <div className="source-grid">
          {snapshot.sources.map((source) => {
            const listingCount = shows.filter((show) => matchesSource(show, source.name)).length;

            return (
            <button
              aria-label={`Show listings from ${source.name}`}
              aria-pressed={selectedSource === source.name}
              className={`source-card source-card-button ${selectedSource === source.name ? "selected" : ""}`}
              key={source.name}
              onClick={() => showSourceListings(source.name)}
              type="button"
            >
              <div className={`source-status ${source.waiting ? "waiting" : ""}`}>
                {source.waiting ? "Watching for season" : "Source verified"}
              </div>
              <h3>{source.name}</h3>
              <p>{source.note}</p>
              <span className="source-card-action">
                {listingCount ? `${listingCount} ${listingCount === 1 ? "listing" : "listings"}` : "No listings yet"}
                <span aria-hidden="true">→</span>
              </span>
            </button>
          )})}
        </div>
      </section>

      <footer className="footer">
        <strong>Valley Stage</strong>
        <div className="footer-meta">
          <span>Automated theater discovery centered on {snapshot.center.label}</span>
          <a href={contactFormUrl} target="_blank" rel="noreferrer">Contact</a>
        </div>
      </footer>
    </main>
  );
}
