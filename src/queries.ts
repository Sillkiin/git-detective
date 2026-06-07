/**
 * High-level repo questions, each returning a plain object the MCP layer wraps
 * as JSON. Keeping these separate from tool registration keeps them testable
 * and keeps index.ts thin.
 */
import { logCommits, runGit, type Commit } from "./git.js";
import { computeHotspots, type Hotspot } from "./analysis/hotspots.js";
import { computeCoupling, type CoupledPair } from "./analysis/coupling.js";
import { computeOwnership, type OwnershipReport } from "./analysis/ownership.js";

/** Build the shared --since / -n filters used by most queries. */
function windowArgs(since?: string, maxCommits?: number): string[] {
  const args: string[] = [];
  if (since) args.push(`--since=${since}`);
  if (maxCommits) args.push(`-n${maxCommits}`);
  return args;
}

export interface RepoOverview {
  branch: string;
  totalCommits: number;
  trackedFiles: number;
  firstCommit: string;
  lastCommit: string;
  ageDays: number;
  contributors: number;
  topContributors: { author: string; commits: number }[];
}

export async function repoOverview(repoPath: string): Promise<RepoOverview> {
  const [branch, count, files, first, last, shortlog] = await Promise.all([
    runGit(repoPath, ["rev-parse", "--abbrev-ref", "HEAD"]),
    runGit(repoPath, ["rev-list", "--count", "HEAD"]),
    runGit(repoPath, ["ls-files"]),
    runGit(repoPath, ["log", "--reverse", "--format=%aI", "--max-parents=0"]),
    runGit(repoPath, ["log", "-1", "--format=%aI"]),
    runGit(repoPath, ["shortlog", "-sne", "HEAD"]),
  ]);

  const firstCommit = first.split("\n")[0]?.trim() || "";
  const lastCommit = last.trim();
  const topContributors = parseShortlog(shortlog);

  return {
    branch: branch.trim(),
    totalCommits: parseInt(count.trim(), 10) || 0,
    trackedFiles: files.split("\n").filter((l) => l.trim()).length,
    firstCommit,
    lastCommit,
    ageDays: daysBetween(firstCommit, lastCommit),
    contributors: topContributors.length,
    topContributors: topContributors.slice(0, 10),
  };
}

/** Parse `git shortlog -sne` lines: "  42\tName <email>". */
function parseShortlog(raw: string): { author: string; commits: number }[] {
  return raw
    .split("\n")
    .map((line) => {
      const match = line.match(/^\s*(\d+)\s+(.*?)\s*<.*>$/);
      if (!match) return null;
      return { author: match[2], commits: parseInt(match[1], 10) };
    })
    .filter((x): x is { author: string; commits: number } => x !== null)
    .sort((a, b) => b.commits - a.commits);
}

export interface ActivitySummary {
  window: string;
  commits: number;
  authors: { author: string; commits: number }[];
  filesTouched: number;
  topFiles: { path: string; commits: number }[];
  recentCommits: { hash: string; author: string; date: string; subject: string }[];
}

export async function recentActivity(
  repoPath: string,
  since: string,
  maxCommits: number
): Promise<ActivitySummary> {
  const commits = await logCommits(repoPath, windowArgs(since, maxCommits));
  const authorCounts = countBy(commits, (c) => c.author);
  const fileCounts = new Map<string, number>();
  for (const c of commits) {
    for (const f of c.files) fileCounts.set(f.path, (fileCounts.get(f.path) ?? 0) + 1);
  }

  return {
    window: since,
    commits: commits.length,
    authors: toSortedEntries(authorCounts).map(([author, n]) => ({ author, commits: n })),
    filesTouched: fileCounts.size,
    topFiles: toSortedEntries(fileCounts)
      .slice(0, 15)
      .map(([path, n]) => ({ path, commits: n })),
    recentCommits: commits.slice(0, 20).map((c) => ({
      hash: c.hash.slice(0, 10),
      author: c.author,
      date: c.date,
      subject: c.subject,
    })),
  };
}

export interface FileHistory {
  path: string;
  totalCommits: number;
  authors: { author: string; commits: number }[];
  firstChange: string;
  lastChange: string;
  commits: { hash: string; author: string; date: string; subject: string }[];
}

export async function fileHistory(
  repoPath: string,
  path: string,
  maxCommits: number
): Promise<FileHistory> {
  const commits = await logCommits(repoPath, ["--follow", `-n${maxCommits}`, "--", path]);
  if (commits.length === 0) {
    throw new Error(`No history found for "${path}". Check the path is correct and tracked.`);
  }
  const authorCounts = countBy(commits, (c) => c.author);
  const dates = commits.map((c) => c.date).filter(Boolean).sort();

  return {
    path,
    totalCommits: commits.length,
    authors: toSortedEntries(authorCounts).map(([author, n]) => ({ author, commits: n })),
    firstChange: dates[0] ?? "",
    lastChange: dates[dates.length - 1] ?? "",
    commits: commits.map((c) => ({
      hash: c.hash.slice(0, 10),
      author: c.author,
      date: c.date,
      subject: c.subject,
    })),
  };
}

export interface CommitSearchResult {
  matches: number;
  commits: { hash: string; author: string; date: string; subject: string; files: number }[];
}

export async function searchCommits(
  repoPath: string,
  opts: {
    message?: string;
    author?: string;
    since?: string;
    touchingCode?: string;
    maxCommits: number;
  }
): Promise<CommitSearchResult> {
  const args: string[] = [`-n${opts.maxCommits}`];
  if (opts.message) args.push(`--grep=${opts.message}`, "-i");
  if (opts.author) args.push(`--author=${opts.author}`);
  if (opts.since) args.push(`--since=${opts.since}`);
  // Pickaxe: commits that changed the number of occurrences of a string.
  if (opts.touchingCode) args.push(`-S${opts.touchingCode}`);

  const commits = await logCommits(repoPath, args);
  return {
    matches: commits.length,
    commits: commits.map((c) => ({
      hash: c.hash.slice(0, 10),
      author: c.author,
      date: c.date,
      subject: c.subject,
      files: c.files.length,
    })),
  };
}

export async function hotspots(
  repoPath: string,
  since: string | undefined,
  limit: number
): Promise<Hotspot[]> {
  const commits = await logCommits(repoPath, windowArgs(since));
  return computeHotspots(commits, limit);
}

export async function coupling(
  repoPath: string,
  since: string | undefined,
  limit: number,
  minShared: number
): Promise<CoupledPair[]> {
  const commits = await logCommits(repoPath, windowArgs(since));
  return computeCoupling(commits, limit, minShared);
}

export async function ownership(
  repoPath: string,
  path: string | undefined
): Promise<OwnershipReport> {
  const scope = path && path.trim() ? path : ".";
  const args = path && path.trim() ? ["--", path] : [];
  const commits = await logCommits(repoPath, args);
  return computeOwnership(commits, scope);
}

// --- small shared helpers -------------------------------------------------

function countBy<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

function toSortedEntries(map: Map<string, number>): [string, number][] {
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export function daysBetween(isoA: string, isoB: string): number {
  const a = Date.parse(isoA);
  const b = Date.parse(isoB);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export type { Commit };
