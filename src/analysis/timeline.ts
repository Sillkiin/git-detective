/**
 * Time-based analysis shared by author_activity and stale_files:
 * - bucket commits by calendar month (for an activity timeline)
 * - find the last time each file changed (for staleness)
 *
 * Both functions are pure so they can be unit-tested without a real repo.
 */
import type { Commit } from "../git.js";

export interface MonthBucket {
  month: string; // "YYYY-MM"
  commits: number;
}

/** Group commits into ascending calendar-month buckets. */
export function bucketByMonth(commits: Commit[]): MonthBucket[] {
  const counts = new Map<string, number>();
  for (const commit of commits) {
    const month = commit.date.slice(0, 7); // ISO date -> YYYY-MM
    if (month.length !== 7) continue;
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([month, n]) => ({ month, commits: n }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export interface StaleFile {
  path: string;
  lastChanged: string; // ISO date
  daysSinceChange: number;
}

/**
 * From newest-first commits, find each file's most recent change date, then
 * return the files (still tracked) whose last change predates `cutoffISO`.
 */
export function findStaleFiles(
  commits: Commit[],
  trackedPaths: Set<string>,
  cutoffISO: string,
  asOfISO: string,
  limit: number
): StaleFile[] {
  const lastChange = new Map<string, string>();
  // commits are newest-first, so the first time we see a path is its last change.
  for (const commit of commits) {
    if (!commit.date) continue;
    for (const file of commit.files) {
      if (!lastChange.has(file.path)) lastChange.set(file.path, commit.date);
    }
  }

  const asOf = Date.parse(asOfISO);
  const stale: StaleFile[] = [];
  for (const [path, date] of lastChange) {
    if (!trackedPaths.has(path)) continue; // skip deleted/renamed-away files
    if (date >= cutoffISO) continue; // changed recently enough
    const ageMs = asOf - Date.parse(date);
    stale.push({
      path,
      lastChanged: date,
      daysSinceChange: Number.isNaN(ageMs) ? 0 : Math.max(0, Math.round(ageMs / 86_400_000)),
    });
  }

  return stale
    .sort((a, b) => a.lastChanged.localeCompare(b.lastChanged))
    .slice(0, limit);
}
