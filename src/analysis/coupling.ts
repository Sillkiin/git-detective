/**
 * Change-coupling (temporal coupling): files that keep changing together in the
 * same commits are implicitly dependent, even when nothing in the code says so.
 * High coupling between distant modules is a classic hidden-maintenance trap.
 */
import type { Commit } from "../git.js";

export interface CoupledPair {
  a: string;
  b: string;
  shared: number; // commits that touched both files
  support: number; // shared / total-commits-in-window, as a percentage
  confidence: number; // shared / commits-touching-A, as a percentage (directional)
}

/** Max files in a commit before we treat it as a bulk change and skip it. */
const BULK_COMMIT_THRESHOLD = 30;

/**
 * Find pairs of files that frequently change together.
 * `minShared` filters out noise; results are ranked by confidence then support.
 */
export function computeCoupling(
  commits: Commit[],
  limit: number,
  minShared = 3
): CoupledPair[] {
  const fileCommitCount = new Map<string, number>();
  const pairCount = new Map<string, number>();
  let scopedCommits = 0;

  for (const commit of commits) {
    const paths = commit.files.map((f) => f.path);
    // Bulk commits (mass formatting, vendoring) couple everything to everything.
    if (paths.length < 2 || paths.length > BULK_COMMIT_THRESHOLD) {
      for (const p of paths) fileCommitCount.set(p, (fileCommitCount.get(p) ?? 0) + 1);
      if (paths.length >= 1) scopedCommits += 1;
      continue;
    }
    scopedCommits += 1;

    const sorted = [...new Set(paths)].sort();
    for (const p of sorted) fileCommitCount.set(p, (fileCommitCount.get(p) ?? 0) + 1);

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = sorted[i] + "\x00" + sorted[j];
        pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
      }
    }
  }

  const pairs: CoupledPair[] = [];
  for (const [key, shared] of pairCount) {
    if (shared < minShared) continue;
    const [a, b] = key.split("\x00");
    const countA = fileCommitCount.get(a) ?? shared;
    const countB = fileCommitCount.get(b) ?? shared;
    // Directional confidence: how often B changes when A does (use the stronger side).
    const confidence = (shared / Math.min(countA, countB)) * 100;
    const support = scopedCommits > 0 ? (shared / scopedCommits) * 100 : 0;
    pairs.push({
      a,
      b,
      shared,
      support: round(support),
      confidence: round(confidence),
    });
  }

  return pairs
    .sort((x, y) => y.confidence - x.confidence || y.shared - x.shared)
    .slice(0, limit);
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
