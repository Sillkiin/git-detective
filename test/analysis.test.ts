import { test } from "node:test";
import assert from "node:assert/strict";
import type { Commit } from "../src/git.js";
import { computeHotspots } from "../src/analysis/hotspots.js";
import { computeCoupling } from "../src/analysis/coupling.js";
import { computeOwnership, computeBusFactor } from "../src/analysis/ownership.js";
import { daysBetween } from "../src/queries.js";

function commit(
  hash: string,
  author: string,
  date: string,
  files: [string, number, number][]
): Commit {
  return {
    hash,
    author,
    email: `${author}@x.io`,
    date,
    subject: hash,
    files: files.map(([path, added, deleted]) => ({ path, added, deleted })),
  };
}

const sample: Commit[] = [
  commit("c1", "Ada", "2024-01-01T00:00:00Z", [["a.ts", 10, 0], ["b.ts", 5, 0]]),
  commit("c2", "Ada", "2024-01-02T00:00:00Z", [["a.ts", 3, 1], ["b.ts", 2, 0]]),
  commit("c3", "Lin", "2024-01-03T00:00:00Z", [["a.ts", 1, 1], ["b.ts", 1, 0]]),
  commit("c4", "Lin", "2024-01-04T00:00:00Z", [["a.ts", 1, 0]]),
  commit("c5", "Ada", "2024-01-05T00:00:00Z", [["c.ts", 9, 0]]),
];

test("computeHotspots ranks files by change frequency", () => {
  const spots = computeHotspots(sample, 10);
  assert.equal(spots[0].path, "a.ts");
  assert.equal(spots[0].commits, 4);
  assert.equal(spots[0].authors, 2);
  assert.equal(spots[1].path, "b.ts");
  assert.equal(spots[1].commits, 3);
});

test("computeHotspots respects the limit", () => {
  assert.equal(computeHotspots(sample, 1).length, 1);
});

test("computeCoupling finds files that change together", () => {
  const pairs = computeCoupling(sample, 10, 3);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].a, "a.ts");
  assert.equal(pairs[0].b, "b.ts");
  assert.equal(pairs[0].shared, 3); // c1, c2, c3
  assert.equal(pairs[0].confidence, 100); // b.ts always changes with a.ts (3/3)
});

test("computeCoupling filters pairs below minShared", () => {
  assert.deepEqual(computeCoupling(sample, 10, 4), []);
});

test("computeOwnership computes shares and primary owner", () => {
  const report = computeOwnership(sample, ".");
  assert.equal(report.totalCommits, 5);
  assert.equal(report.contributors, 2);
  assert.equal(report.primaryOwner?.author, "Ada");
  assert.equal(report.primaryOwner?.commits, 3);
  assert.equal(report.primaryOwner?.share, 60);
});

test("computeBusFactor counts authors needed to cover half the commits", () => {
  const report = computeOwnership(sample, ".");
  // Ada alone covers 3/5 = 60% >= 50%, so bus factor is 1.
  assert.equal(report.busFactor, 1);
  assert.equal(computeBusFactor([], 0), 0);
});

test("daysBetween computes whole-day spans and guards bad input", () => {
  assert.equal(daysBetween("2024-01-01T00:00:00Z", "2024-01-11T00:00:00Z"), 10);
  assert.equal(daysBetween("", "2024-01-11T00:00:00Z"), 0);
});
