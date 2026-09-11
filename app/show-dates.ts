const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function pacificDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function dateKey(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

// Yearless legacy listings belong to the 2026 season, never the viewer's year.
// A month or season announcement is not an exact opening date.
export function runDates(run: string): { start: string; end: string } | null {
  const explicitRange = run.match(/^([A-Za-z]+ \d{1,2}, 20\d{2})[–-]([A-Za-z]+ \d{1,2}, 20\d{2})$/);
  if (explicitRange) {
    const first = runDates(explicitRange[1]);
    const last = runDates(explicitRange[2]);
    return first && last && first.start <= last.end ? { start: first.start, end: last.end } : null;
  }
  const dateList = run.match(/^([A-Za-z]+) (\d{1,2}(?:, \d{1,2})* & \d{1,2}), (20\d{2})$/);
  if (dateList) {
    const dates = dateList[2].split(/, | & /).map(day => dateKey(Number(dateList[3]), months.indexOf(dateList[1]), Number(day)));
    if (dates.some(day => !day)) return null;
    const ordered = (dates as string[]).sort();
    return { start: ordered[0], end: ordered[ordered.length - 1] };
  }
  const match = run.match(/^([A-Za-z]+) (\d{1,2})(?:[–-](?:([A-Za-z]+) )?(\d{1,2}))?(?:, (20\d{2}))?$/);
  if (!match) return null;
  const startMonth = months.indexOf(match[1]);
  const endMonth = match[3] ? months.indexOf(match[3]) : startMonth;
  if (startMonth < 0 || endMonth < 0) return null;
  const year = Number(match[5] ?? 2026);
  const start = dateKey(year, startMonth, Number(match[2]));
  const end = dateKey(year + (endMonth < startMonth ? 1 : 0), endMonth, Number(match[4] ?? match[2]));
  return start && end && start <= end ? { start, end } : null;
}

type DatedShow = { run: string; next: string; status: "now" | "soon" | "auditions" };

export function currentShows<T extends DatedShow>(shows: T[], today: string): T[] {
  return shows.flatMap((show) => {
    const dates = runDates(show.run);
    if (!dates) return [show];
    if (today > dates.end) return [];
    const status = show.status === "auditions" ? "auditions" : today >= dates.start ? "now" : "soon";
    const nextDate = show.next.match(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), ([A-Za-z]{3}) (\d{1,2})/);
    const month = nextDate ? months.findIndex((name) => name.startsWith(nextDate[1])) : -1;
    const year = Number(dates.start.slice(0, 4)) + (month + 1 < Number(dates.start.slice(5, 7)) ? 1 : 0);
    const nextDay = nextDate && month >= 0 ? dateKey(year, month, Number(nextDate[2])) : null;
    const next = nextDay && nextDay < today
      ? "See the official " + (status === "auditions" ? "audition details" : "performance calendar")
      : show.next;
    return [{ ...show, status, next }];
  });
}
