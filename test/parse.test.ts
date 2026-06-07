import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLog, parseNumstatLine, normalizeRenamePath } from "../src/git.js";

const FIELD = "\x1f";
const RECORD = "\x1e";

function commitRecord(
  hash: string,
  author: string,
  email: string,
  date: string,
  subject: string,
  numstat: string[]
): string {
  const header = RECORD + [hash, author, email, date, subject].join(FIELD);
  return [header, ...numstat].join("\n");
}

test("parseLog reads metadata and numstat into structured commits", () => {
  const raw =
    commitRecord("abc123", "Ada", "ada@x.io", "2024-01-02T10:00:00Z", "Add parser", [
      "10\t2\tsrc/git.ts",
      "5\t0\tREADME.md",
    ]) +
    "\n" +
    commitRecord("def456", "Lin", "lin@x.io", "2024-01-03T10:00:00Z", "Tweak", [
      "1\t1\tsrc/git.ts",
    ]);

  const commits = parseLog(raw);
  assert.equal(commits.length, 2);
  assert.equal(commits[0].hash, "abc123");
  assert.equal(commits[0].author, "Ada");
  assert.equal(commits[0].files.length, 2);
  assert.deepEqual(commits[0].files[0], { path: "src/git.ts", added: 10, deleted: 2 });
  assert.equal(commits[1].files[0].path, "src/git.ts");
});

test("parseLog returns empty array for empty input", () => {
  assert.deepEqual(parseLog(""), []);
});

test("parseNumstatLine marks binary files with -1", () => {
  const change = parseNumstatLine("-\t-\tlogo.png");
  assert.deepEqual(change, { path: "logo.png", added: -1, deleted: -1 });
});

test("parseNumstatLine returns null for malformed lines", () => {
  assert.equal(parseNumstatLine("not a numstat line"), null);
});

test("normalizeRenamePath collapses brace rename syntax to the new path", () => {
  assert.equal(normalizeRenamePath("src/{old => new}/file.ts"), "src/new/file.ts");
});

test("normalizeRenamePath collapses plain arrow rename syntax", () => {
  assert.equal(normalizeRenamePath("old/path.ts => new/path.ts"), "new/path.ts");
});

test("normalizeRenamePath leaves ordinary paths untouched", () => {
  assert.equal(normalizeRenamePath("src/index.ts"), "src/index.ts");
});
