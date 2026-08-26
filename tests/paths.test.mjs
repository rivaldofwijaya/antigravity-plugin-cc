import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, delimiter } from "node:path";
import { resolveAgyBinary, AGY_BIN_NAME, IS_WINDOWS } from "../plugins/antigravity/scripts/lib/paths.mjs";

// Every path here is rooted in a temp dir. Nothing in this file may write to the
// real home directory — an earlier revision did, and clobbered a live agy install.
function makeBin(dir) {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, AGY_BIN_NAME);
  writeFileSync(path, "#!/bin/sh\nexit 0\n");
  if (!IS_WINDOWS) chmodSync(path, 0o755);
  return path;
}

function fakeHome() {
  const home = mkdtempSync(join(tmpdir(), "agy-home-"));
  return { home, wellKnown: join(home, ".local", "bin") };
}

test("env override wins over everything", () => {
  const { home, wellKnown } = fakeHome();
  makeBin(wellKnown);
  const overrideDir = mkdtempSync(join(tmpdir(), "agy-override-"));
  const bin = makeBin(overrideDir);

  const got = resolveAgyBinary({ ANTIGRAVITY_CC_AGY_BIN: bin, HOME: home, PATH: "" });
  assert.equal(got.path, bin);
  assert.match(got.source, /env/);
});

test("a writable PATH entry does not shadow the well-known install location", () => {
  // Finding 7: an attacker-controlled directory early on PATH must not win.
  const { home, wellKnown } = fakeHome();
  const real = makeBin(wellKnown);
  const attacker = mkdtempSync(join(tmpdir(), "agy-evil-"));
  makeBin(attacker);

  const got = resolveAgyBinary({ HOME: home, PATH: attacker + delimiter + "/usr/bin" });
  assert.equal(got.path, real, "well-known location must be preferred over PATH");
  assert.equal(got.source, "well-known location");
});

test("PATH is still used when no well-known install exists", () => {
  const { home } = fakeHome();
  const pathDir = mkdtempSync(join(tmpdir(), "agy-path-only-"));
  const bin = makeBin(pathDir);

  const got = resolveAgyBinary({ HOME: home, PATH: pathDir });
  assert.equal(got.path, bin);
  assert.equal(got.source, "PATH");
});

test("returns null when nothing resolves", () => {
  const { home } = fakeHome();
  const empty = mkdtempSync(join(tmpdir(), "agy-empty-"));
  assert.equal(resolveAgyBinary({ HOME: home, PATH: empty }), null);
});
