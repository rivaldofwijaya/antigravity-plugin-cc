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
  assert.ok(
    /\n\n---\n/.test(text.slice(text.indexOf("An `empty` result is a different case"))),
    "the empty/quota paragraph must be followed by a blank line, or the `---` renders as a setext heading",
  );
});

test("the anti-patterns reference does not restate the universal model-behaviour claims", () => {
  const p = "plugins/antigravity/skills/antigravity-prompting/references/antigravity-antipatterns.md";
  const text = readFileSync(p, "utf8");
  for (const claim of [
    "Antigravity follows instructions literally",
    "Antigravity handles long context well",
    "In a long prompt, Antigravity can drop",
  ]) {
    assert.ok(!text.includes(claim), `antipatterns.md must not restate the removed claim: "${claim}"`);
  }
  assert.ok(
    text.includes("Print mode cannot ask which one you meant"),
    "item 1 must ground the vague-goal cost in the print-mode interface",
  );
  assert.ok(
    text.includes("a negative or quantitative constraint that appears early is the one most often dropped"),
    "item 4 must ground constraint ordering in observed prompt behaviour, not a model claim",
  );
});

test("a timeout is inspected before it is retried", () => {
  const p = "plugins/antigravity/skills/antigravity-result-handling/SKILL.md";
  const text = readFileSync(p, "utf8");
  assert.ok(text.includes("**A timeout is not a rollback.**"), "Case 5 must say a timeout is not a rollback");
  assert.ok(
    text.includes("Before proposing any re-run, check what survived"),
    "Case 5 must require inspecting surviving work before a retry",
  );
  assert.ok(
    text.includes("Prefer the exact conversation id over “most recent”"),
    "Case 5 must prefer the exact conversation id",
  );
  assert.ok(
    /\| Backend error \/ timeout \|.*check what survived/.test(text),
    "the quick-reference row must carry the inspect-first instruction",
  );
  assert.ok(
    text.includes("an absence of visible edits does not prove it stopped"),
    "the garbled double-negative clause must be repaired",
  );
  assert.ok(
    /\*\*Foreground timeout\.\*\*[^\n]*already dead/.test(text),
    "Case 5 must resolve terminal state for a foreground timeout without a status check",
  );
  assert.ok(
    text.includes("/antigravity:cancel") && /\*\*`--background` job\.\*\*/.test(text),
    "Case 5 must name the cancel command on the background path",
  );
  assert.ok(
    text.includes("records the signal the companion sent, not a confirmed exit"),
    "Case 5 must warn that a reported cancellation is not a confirmed exit",
  );
});

test("a write-capable run is measured against a recorded baseline", () => {
  const prompting = readFileSync("plugins/antigravity/skills/antigravity-prompting/SKILL.md", "utf8");
  const result = readFileSync("plugins/antigravity/skills/antigravity-result-handling/SKILL.md", "utf8");
  const runtime = readFileSync("plugins/antigravity/skills/antigravity-cli-runtime/SKILL.md", "utf8");
  assert.ok(
    prompting.replace(/\s+/g, " ").includes("record the starting state — `git status --porcelain` and the current commit"),
    "prompting must require a pre-run baseline",
  );
  assert.ok(
    result.includes("against the baseline taken before the run"),
    "result handling must compare against the baseline",
  );
  assert.ok(
    result.includes("Changes that were already there are the developer's"),
    "result handling must not attribute pre-existing changes to Antigravity",
  );
  assert.ok(
    /belong(?:s)? to the controller that invoked this subagent/.test(runtime),
    "the runtime contract must place the checks outside the forwarder",
  );
  assert.ok(
    runtime.includes("exactly one") && runtime.includes("verbatim"),
    "the thin-forwarder contract must survive intact",
  );
  // The baseline requirement must cover every delegation, because Case 1 requires a
  // saved baseline for --read-only / --sandbox / --plan runs too.
  assert.ok(
    prompting.replace(/\s+/g, " ").includes("before every delegation, not only a write-capable one"),
    "the baseline requirement must cover contained runs, not only write-capable ones",
  );
  assert.ok(
    result.includes("comparison against the saved baseline"),
    "Case 1 must still require the contained-run comparison the prompting skill now provisions",
  );
  for (const p of ["README.md", "plugins/antigravity/commands/review.md"]) {
    const text = readFileSync(p, "utf8");
    assert.ok(
      /Record a baseline before any run|record a baseline before the run/.test(text),
      `${p} must ask for a pre-run baseline, not a bare post-hoc git status`,
    );
    assert.ok(
      !/so check `git status` when it matters|check `git status` afterwards/.test(text),
      `${p} must not prescribe a bare post-hoc git status`,
    );
  }
});

test("prompting guidance does not claim uniform behaviour across served models", () => {
  const p = "plugins/antigravity/skills/antigravity-prompting/SKILL.md";
  const text = readFileSync(p, "utf8");
  assert.ok(
    !text.includes("applies across the models served by Antigravity"),
    "the universal behavioural claim must be gone",
  );
  assert.ok(
    text.includes("## Writing a brief that survives print mode"),
    "the section must be reframed around the brief",
  );
  assert.ok(
    text.includes("properties of the print-mode interface"),
    "the guidance must state what it is grounded in",
  );
  assert.ok(
    text.includes("Say what “done” looks like"),
    "the guidance must lead with acceptance criteria",
  );
});

test("the recipes reference does not restate the universal model-behaviour claim", () => {
  const p = "plugins/antigravity/skills/antigravity-prompting/references/antigravity-recipes.md";
  const text = readFileSync(p, "utf8");
  assert.ok(
    !text.includes("Antigravity can drop a negative constraint"),
    "recipes.md must not attribute dropped constraints to Antigravity's model behaviour",
  );
  assert.ok(
    text.includes("a negative constraint that appears too early is the one most often dropped"),
    "recipes.md must ground the claim in the print-mode interface, consistent with antipatterns.md item 4",
  );
});
