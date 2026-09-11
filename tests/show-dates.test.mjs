import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { currentShows, pacificDay, runDates } from '../app/show-dates.ts';
const snapshot = JSON.parse(readFileSync(new URL('../data/pilot-snapshot.json', import.meta.url), 'utf8'));
const opening = snapshot.shows.filter(s => ['little-shop', 'the-father', 'philadelphia-story-porterville'].includes(s.id)).map(s => ({...s, status: 'soon'}));
test('all three September 11 openings transition without a snapshot refresh', () => {
  assert.equal(opening.length, 3);
  assert.ok(currentShows(opening, '2026-09-10').every(s => s.status === 'soon'));
  assert.ok(currentShows(opening, '2026-09-11').every(s => s.status === 'now'));
});
test('uses Pacific midnight, including daylight saving and winter offsets', () => {
  assert.equal(pacificDay(new Date('2026-09-11T06:59:59Z')), '2026-09-10');
  assert.equal(pacificDay(new Date('2026-09-11T07:00:00Z')), '2026-09-11');
  assert.equal(pacificDay(new Date('2027-01-15T07:59:59Z')), '2027-01-14');
  assert.equal(pacificDay(new Date('2027-01-15T08:00:00Z')), '2027-01-15');
});
test('keeps closing day, hides completed runs, and preserves source records', () => {
  assert.equal(currentShows(opening, '2026-09-20').length, 3);
  assert.equal(currentShows(opening, '2026-09-21').length, 2);
  assert.equal(currentShows(opening, '2026-09-27').length, 0);
  assert.ok(!currentShows(snapshot.shows, '2026-09-11').some(s => s.id === 'how-to-train-your-dragon-selma'));
  assert.ok(opening.every(s => s.status === 'soon'));
});
test('does not invent openings from approximate dates or relabel auditions', () => {
  for (const run of ['February 2027', 'Spring 2027', '2026 season · exact dates pending', 'February 30–31']) assert.equal(runDates(run), null);
  const audition = {run: 'September 15–16, 2026', next: 'Tue, Sep 15', status: 'auditions'};
  assert.equal(currentShows([audition], '2026-09-15')[0].status, 'auditions');
  assert.equal(currentShows([audition], '2026-09-17').length, 0);
});
test('handles cross-month runs, explicit years, and stale next-performance dates', () => {
  assert.deepEqual(runDates('July 24–September 20'), {start: '2026-07-24', end: '2026-09-20'});
  assert.deepEqual(runDates('February 26–March 7, 2027'), {start: '2027-02-26', end: '2027-03-07'});
  assert.deepEqual(runDates('December 30–January 2, 2026'), {start: '2026-12-30', end: '2027-01-02'});
  assert.equal(currentShows(opening, '2026-09-12')[0].next, 'See the official performance calendar');
  assert.equal(currentShows(opening, '2026-09-11')[0].next, opening[0].next);
});

test('supports runs spanning explicit years and nonconsecutive performance dates', () => {
  assert.deepEqual(runDates('November 20, 2026–January 17, 2027'), {start: '2026-11-20', end: '2027-01-17'});
  assert.deepEqual(runDates('October 7, 8 & 10, 2026'), {start: '2026-10-07', end: '2026-10-10'});
});
