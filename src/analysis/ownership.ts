/**
 * Ownership & bus-factor: who actually knows a file or directory, and how
 * concentrated that knowledge is. A high-churn area owned by one departing
 * author is an organizational risk, not just a code one.
 */
import type { Commit } from "../git.js";

export interface AuthorShare {
  author: string;
  commits: number;
  linesChanged: number;
  share: number; // percentage of commits in scope
}

export interface OwnershipReport {
  scope: string;
  totalCommits: number;
  contributors: number;
  busFactor: number; // # of authors covering >=50% of changes
  primaryOwner: AuthorShare | null;
  authors: AuthorShare[];
}

/**
 * Summarize ownership for a set of commits already scoped to a path.
 * `scope` is just the path label echoed back in the report.
 */
export function computeOwnership(commits: Commit[], scope: string): OwnershipReport {
  const byAuthor = new Map<string, { commits: number; lines: number }>();

  for (const commit of commits) {
    const entry = byAuthor.get(commit.author) ?? { commits: 0, lines: 0 };
    entry.commits += 1;
    for (const file of commit.files) {
      entry.lines += Math.max(0, file.added) + Math.max(0, file.deleted);
    }
    byAuthor.set(commit.author, entry);
  }

  const total = commits.length;
  const authors: AuthorShare[] = [...byAuthor.entries()]
    .map(([author, e]) => ({
      author,
      commits: e.commits,
      linesChanged: e.lines,
      share: total > 0 ? Math.round((e.commits / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.commits - a.commits);

  return {
    scope,
    totalCommits: total,
    contributors: authors.length,
    busFactor: computeBusFactor(authors, total),
    primaryOwner: authors[0] ?? null,
    authors,
  };
}

/** Fewest authors whose combined commits cover at least half of all changes. */
export function computeBusFactor(authors: AuthorShare[], total: number): number {
  if (total === 0) return 0;
  let cumulative = 0;
  let count = 0;
  for (const a of authors) {
    cumulative += a.commits;
    count += 1;
    if (cumulative / total >= 0.5) break;
  }
  return count;
}
