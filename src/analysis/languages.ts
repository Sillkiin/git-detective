/**
 * Language / file-type breakdown from the tracked file list. A quick way for an
 * agent to understand "what kind of codebase is this?" without reading files.
 */

/** Minimal extension → friendly language map for the common cases. */
const LANGUAGE_BY_EXT: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  py: "Python",
  rb: "Ruby",
  go: "Go",
  rs: "Rust",
  java: "Java",
  kt: "Kotlin",
  swift: "Swift",
  c: "C",
  h: "C/C++ header",
  cpp: "C++",
  cc: "C++",
  cs: "C#",
  php: "PHP",
  ets: "ArkTS",
  md: "Markdown",
  json: "JSON",
  yml: "YAML",
  yaml: "YAML",
  css: "CSS",
  scss: "SCSS",
  html: "HTML",
  sh: "Shell",
  sql: "SQL",
};

export interface LanguageStat {
  language: string;
  extension: string;
  files: number;
  share: number; // percentage of tracked files
}

/** Group tracked file paths by extension and rank by file count. */
export function summarizeLanguages(paths: string[], limit = 12): LanguageStat[] {
  const counts = new Map<string, number>();
  for (const path of paths) {
    const ext = extensionOf(path);
    counts.set(ext, (counts.get(ext) ?? 0) + 1);
  }

  const total = paths.length;
  return [...counts.entries()]
    .map(([extension, files]) => ({
      extension,
      language: LANGUAGE_BY_EXT[extension] ?? (extension || "(no extension)"),
      files,
      share: total > 0 ? Math.round((files / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.files - a.files)
    .slice(0, limit);
}

/** Lowercased extension without the dot; "" when there is none. */
export function extensionOf(path: string): string {
  const base = path.slice(path.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  // Treat dotfiles (".gitignore") as having no extension.
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}
