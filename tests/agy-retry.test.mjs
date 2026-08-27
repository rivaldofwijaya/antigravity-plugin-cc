import { test, before } from "node:test";
import assert from "node:assert/strict";
import { chmodSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildPrintArgs, runForeground } from "../plugins/antigravity/scripts/lib/agy.mjs";

const FAKE_AGY = fileURLToPath(new URL("./fake-agy.mjs", import.meta.url));

before(() => {
  chmodSync(FAKE_AGY, 0o755);
});

test("runForeground retries once without the probe flags when agy rejects them", () => {
  const originalStderrWrite = process.stderr.write;
  let diagnostic = "";
  let res;

  process.stderr.write = (chunk) => {
    diagnostic += String(chunk);
    return true;
  };
  try {
    process.env.FAKE_AGY_MODE = "legacy-flag-error";
    const args = buildPrintArgs({ prompt: "hello" });
    res = runForeground({ bin: FAKE_AGY, args, cwd: process.cwd(), watchdogMs: 30_000 });
  } finally {
    delete process.env.FAKE_AGY_MODE;
    process.stderr.write = originalStderrWrite;
  }

  assert.equal(res.downgraded, true);
  assert.equal(res.code, 0);
  assert.match(res.stdout, /fake\) reply/);
  assert.doesNotMatch(res.stdout, /\[antigravity-plugin-cc\] note:/);
  assert.match(diagnostic, /\[antigravity-plugin-cc\] note: .*retrying without them/);
});

test("runForeground does not retry a run that already produced stdout", () => {
  process.env.FAKE_AGY_MODE = "success";
  const args = buildPrintArgs({ prompt: "hello" });
  const res = runForeground({ bin: FAKE_AGY, args, cwd: process.cwd(), watchdogMs: 30_000 });
  delete process.env.FAKE_AGY_MODE;

  assert.equal(res.downgraded, false);
});

test("runForeground does not retry a flag rejection that produced stdout", () => {
  process.env.FAKE_AGY_MODE = "flag-error-stdout";
  try {
    const args = buildPrintArgs({ prompt: "hello" });
    const res = runForeground({ bin: FAKE_AGY, args, cwd: process.cwd(), watchdogMs: 30_000 });

    assert.equal(res.code, 2);
    assert.match(res.stdout, /partial output before flag rejection/);
    assert.match(res.stderr, /flag provided but not defined/);
    assert.equal(res.downgraded, false);
  } finally {
    delete process.env.FAKE_AGY_MODE;
  }
});
