import { test } from "node:test";
import assert from "node:assert/strict";
import type { Commit } from "../src/git.js";
import { bucketByMonth, findStaleFiles } from "../src/analysis/timeline.js";

function commit(hash: string, date: string, paths: string[]): Commit {
  return {
    hash,
    author: "Ada",
    email: "ada@x.io",
    date,
    subject: hash,
    files: paths.map((path) => ({ path, added: 1, deleted: 0 })),
  };
}

test("bucketByMonth groups commits into ascending month buckets", () => {
  const buckets = bucketByMonth([
    commit("c1", "2024-01-10T00:00:00Z", ["a"]),
    commit("c2", "2024-01-20T00:00:00Z", ["b"]),
    commit("c3", "2024-03-05T00:00:00Z", ["c"]),
  ]);
  assert.deepEqual(buckets, [
    { month: "2024-01", commits: 2 },
    { month: "2024-03", commits: 1 },
  ]);
});

test("bucketByMonth ignores commits with missing dates", () => {
  assert.deepEqual(bucketByMonth([commit("c1", "", ["a"])]), []);
});

test("findStaleFiles returns tracked files last changed before the cutoff", () => {
  // newest-first, as git log returns them
  const commits = [
    commit("c3", "2024-06-01T00:00:00Z", ["fresh.ts"]),
    commit("c2", "2023-01-01T00:00:00Z", ["old.ts"]),
    commit("c1", "2022-01-01T00:00:00Z", ["old.ts", "ancient.ts"]),
  ];
  const tracked = new Set(["fresh.ts", "old.ts", "ancient.ts"]);
  const stale = findStaleFiles(
    commits,
    tracked,
    "2024-01-01T00:00:00Z", // cutoff
    "2024-06-15T00:00:00Z", // as-of
    10
  );
  assert.deepEqual(
    stale.map((s) => s.path),
    ["ancient.ts", "old.ts"] // oldest first; fresh.ts excluded
  );
  // last change of old.ts is its most recent commit (2023), not 2022
  assert.equal(stale[1].lastChanged, "2023-01-01T00:00:00Z");
});

test("findStaleFiles skips files no longer tracked", () => {
  const commits = [commit("c1", "2020-01-01T00:00:00Z", ["deleted.ts", "kept.ts"])];
  const tracked = new Set(["kept.ts"]);
  const stale = findStaleFiles(commits, tracked, "2024-01-01T00:00:00Z", "2024-01-02T00:00:00Z", 10);
  assert.deepEqual(stale.map((s) => s.path), ["kept.ts"]);
});
