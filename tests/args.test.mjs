import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, hasFlag } from "../plugins/antigravity/scripts/lib/args.mjs";

test("parses boolean flags and positional text", () => {
  const p = parseArgs(["--background", "fix", "the", "auth", "bug"]);
  assert.equal(p.flags.background, true);
  assert.equal(p.text, "fix the auth bug");
});

test("parses valued flags", () => {
  const p = parseArgs(["--base", "main", "--print-timeout", "20m", "look", "for", "races"]);
  assert.equal(p.valued.base, "main");
  assert.equal(p.valued["print-timeout"], "20m");
  assert.equal(p.text, "look for races");
});

test("supports --flag=value form", () => {
  const p = parseArgs(["--base=develop"]);
  assert.equal(p.valued.base, "develop");
});

test("collects repeatable --add-dir", () => {
  const p = parseArgs(["--add-dir", "../shared", "--add-dir", "../proto", "do it"]);
  assert.deepEqual(p.repeated["add-dir"], ["../shared", "../proto"]);
  assert.equal(p.text, "do it");
});

test("maps short -c to continue", () => {
  const p = parseArgs(["-c", "keep going"]);
  assert.equal(p.flags.continue, true);
  assert.equal(p.text, "keep going");
});

test("-- forces remaining tokens to positional", () => {
  const p = parseArgs(["--background", "--", "--not-a-flag", "text"]);
  assert.equal(p.flags.background, true);
  assert.equal(p.text, "--not-a-flag text");
});

test("does not treat negative numbers as flags", () => {
  const p = parseArgs(["offset", "-3", "lines"]);
  assert.equal(p.text, "offset -3 lines");
});

test("hasFlag matches any alias", () => {
  const p = parseArgs(["--wait"]);
  assert.equal(hasFlag(p, "background", "wait"), true);
  assert.equal(hasFlag(p, "background"), false);
});

import { VALID_EFFORTS } from "../plugins/antigravity/scripts/lib/args.mjs";

test("--effort is a valued flag, not swallowed as a boolean", () => {
  const p = parseArgs(["--effort", "high", "do", "the", "thing"]);
  assert.equal(p.valued.effort, "high");
  assert.equal(p.text, "do the thing");
});

test("--model keeps its value and stays out of the prompt text", () => {
  const p = parseArgs(["--model", "gemini-3.1-pro-high", "refactor"]);
  assert.equal(p.valued.model, "gemini-3.1-pro-high");
  assert.equal(p.text, "refactor");
});

test("VALID_EFFORTS is exactly agy's three levels", () => {
  assert.deepEqual([...VALID_EFFORTS].sort(), ["high", "low", "medium"]);
});
