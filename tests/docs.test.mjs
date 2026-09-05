import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("..", import.meta.url));

function grep(pattern, paths) {
  try {
    return execFileSync("grep", ["-rnE", pattern, ...paths], { cwd: REPO, encoding: "utf8" });
  } catch (e) {
    if (e.status === 1) return ""; // grep: no matches
    throw e;
  }
}

// T-D1 — the B5 regression test. reports/ and docs/superpowers/ are excluded:
// they are historical records of what was true when written, and rewriting
// history to match the present would defeat their purpose.
test("no hardcoded model version survives in shipped copy", () => {
  const hits = grep("Gemini 3", ["plugins", "README.md", "CONTRIBUTING.md", "package.json"]);
  assert.equal(hits, "", `hardcoded model names found:\n${hits}`);
});

test("no document still claims agy has no --model flag", () => {
  const hits = grep("no --model|NO .--model|has no model flag", [
    "plugins",
    "docs/antigravity-cli-reference.md",
    "README.md",
    "CONTRIBUTING.md",
  ]);
  assert.equal(hits, "", `stale --model claim found:\n${hits}`);
});

test("the CLI reference records the agy version it was verified against", () => {
  const hits = grep("^> This contract was verified live against `agy 1\\.1\\.21`", [
    "docs/antigravity-cli-reference.md",
  ]);
  assert.notEqual(hits, "", "the reference must carry its verified-against version");
});

test("package.json points at this fork, not upstream", () => {
  const hits = grep("Idun-Group|Idun Labs|idunplatform", ["package.json"]);
  assert.equal(hits, "", `upstream metadata left in package.json:\n${hits}`);

  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.author, "rivaldofwijaya (https://github.com/rivaldofwijaya)");
  assert.equal(pkg.homepage, "https://github.com/rivaldofwijaya/antigravity-plugin-cc");
  assert.deepEqual(pkg.repository, {
    type: "git",
    url: "https://github.com/rivaldofwijaya/antigravity-plugin-cc.git",
  });
});

test("anti-pattern 9 separates an empty run from quota exhaustion", () => {
  const p = "plugins/antigravity/skills/antigravity-prompting/references/antigravity-antipatterns.md";
  const text = readFileSync(p, "utf8");
  assert.ok(
    !/A run returns empty or the companion reports/.test(text),
    "anti-pattern 9 must not group an empty run with a quota error",
  );
  assert.ok(
    text.includes("An `empty` result is a different case and must not be treated as this one."),
    "anti-pattern 9 must state the empty/quota distinction",
  );
  assert.ok(
    text.includes("the companion classifies quota exhaustion separately by scanning the log"),
    "anti-pattern 9 must say where the quota classification comes from",
  );
});
