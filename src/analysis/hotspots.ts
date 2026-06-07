/**
 * Hotspot analysis: files that change most often are where bugs and complexity
 * concentrate (a core idea from "Your Code as a Crime Scene"). A file changed
 * 80 times is a far bigger risk than one changed twice, regardless of size.
 */
import type { Commit } from "../git.js";

export interface Hotspot {
  path: string;
  commits: number; // how many commits touched this file
  authors: number; // distinct authors — low count + high churn = bus-factor risk
  linesChanged: number; // total added + deleted (text files only)
  lastChanged: string; // ISO date of most recent change
}

/** Rank files by how frequently they change. */
export function computeHotspots(commits: Commit[], limit: number): Hotspot[] {
  const byPath = new Map<
    string,
    { commits: number; authors: Set<string>; lines: number; last: string }
  >();

  for (const commit of commits) {
    for (const file of commit.files) {
      const entry =
        byPath.get(file.path) ??
        { commits: 0, authors: new Set<string>(), lines: 0, last: "" };
      entry.commits += 1;
      entry.authors.add(commit.author);
      entry.lines += Math.max(0, file.added) + Math.max(0, file.deleted);
      if (commit.date > entry.last) entry.last = commit.date;
      byPath.set(file.path, entry);
    }
  }

  return [...byPath.entries()]
    .map(([path, e]) => ({
      path,
      commits: e.commits,
      authors: e.authors.size,
      linesChanged: e.lines,
      lastChanged: e.last,
    }))
    .sort((a, b) => b.commits - a.commits || b.linesChanged - a.linesChanged)
    .slice(0, limit);
}
