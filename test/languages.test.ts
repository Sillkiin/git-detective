import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeLanguages, extensionOf } from "../src/analysis/languages.js";

test("extensionOf returns lowercased extension without the dot", () => {
  assert.equal(extensionOf("src/Index.TS"), "ts");
  assert.equal(extensionOf("a/b/file.test.js"), "js");
});

test("extensionOf treats dotfiles and extensionless paths as no extension", () => {
  assert.equal(extensionOf(".gitignore"), "");
  assert.equal(extensionOf("Makefile"), "");
});

test("summarizeLanguages ranks by file count and maps friendly names", () => {
  const stats = summarizeLanguages([
    "src/a.ts",
    "src/b.ts",
    "src/c.ts",
    "README.md",
    "go.mod",
    "main.go",
  ]);
  assert.equal(stats[0].language, "TypeScript");
  assert.equal(stats[0].files, 3);
  assert.equal(stats[0].share, 50);
  const langs = stats.map((s) => s.language);
  assert.ok(langs.includes("Markdown"));
  assert.ok(langs.includes("Go"));
});

test("summarizeLanguages handles an empty repo", () => {
  assert.deepEqual(summarizeLanguages([]), []);
});
