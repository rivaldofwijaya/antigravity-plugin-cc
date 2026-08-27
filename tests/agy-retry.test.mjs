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
  process.env.FAKE_AGY_MODE = "legacy-flag-error";
  const args = buildPrintArgs({ prompt: "hello" });
  const res = runForeground({ bin: FAKE_AGY, args, cwd: process.cwd(), watchdogMs: 30_000 });
  delete process.env.FAKE_AGY_MODE;

  assert.equal(res.downgraded, true);
  assert.equal(res.code, 0);
  assert.match(res.stdout, /fake\) reply/);
});

test("runForeground does not retry a run that already produced stdout", () => {
  process.env.FAKE_AGY_MODE = "success";
  const args = buildPrintArgs({ prompt: "hello" });
  const res = runForeground({ bin: FAKE_AGY, args, cwd: process.cwd(), watchdogMs: 30_000 });
  delete process.env.FAKE_AGY_MODE;

  assert.equal(res.downgraded, false);
});
