import { test, before } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const FAKE_AGY = fileURLToPath(new URL("./fake-agy.mjs", import.meta.url));

before(() => {
  chmodSync(FAKE_AGY, 0o755);
});

function runFake(args, mode) {
  return spawnSync("node", [FAKE_AGY, ...args], {
    encoding: "utf8",
    env: { ...process.env, FAKE_AGY_MODE: mode },
  });
}

test("success mode emits JSON only when --output-format json is present", () => {
  const text = runFake(["-p", "hello"], "success");
  assert.equal(text.status, 0);
  assert.throws(() => JSON.parse(text.stdout), "text mode must not be JSON");

  const json = runFake(["--output-format", "json", "-p", "hello"], "success");
  const parsed = JSON.parse(json.stdout);
  assert.equal(parsed.status, "SUCCESS");
  assert.match(parsed.response, /hello/);
  assert.equal(typeof parsed.usage.total_tokens, "number");
});

test("json-error mode reports a quota failure with exit code 0", () => {
  const res = runFake(["--output-format", "json", "-p", "x"], "json-error");
  assert.equal(res.status, 0, "agy exits 0 even on failure — that is the whole problem");
  const parsed = JSON.parse(res.stdout);
  assert.equal(parsed.status, "ERROR");
  assert.match(parsed.error, /RESOURCE_EXHAUSTED/);
  assert.match(parsed.error, /152h59m39s/);
  assert.equal(parsed.conversation_id, "");
});

test("json-empty mode reports SUCCESS with an empty response", () => {
  const res = runFake(["--output-format", "json", "-p", "x"], "json-empty");
  const parsed = JSON.parse(res.stdout);
  assert.equal(parsed.status, "SUCCESS");
  assert.equal(parsed.response, "");
});

test("json-auth mode reports the 1.1 signed-out error text", () => {
  const res = runFake(["--output-format", "json", "-p", "x"], "json-auth");
  const parsed = JSON.parse(res.stdout);
  assert.equal(parsed.status, "ERROR");
  assert.match(parsed.error, /not logged into Antigravity/);
});

test("legacy-flag-error rejects --output-format, then succeeds without it", () => {
  const rejected = runFake(["--output-format", "json", "-p", "x"], "legacy-flag-error");
  assert.equal(rejected.status, 2);
  assert.match(rejected.stderr, /flag provided but not defined: -output-format/);
  assert.equal(rejected.stdout, "");

  const retried = runFake(["-p", "x"], "legacy-flag-error");
  assert.equal(retried.status, 0);
  assert.match(retried.stdout, /fake\) reply/);
});

test("noisy-log-success writes 1.1 startup auth noise into the log but still responds", () => {
  const logFile = join(mkdtempSync(join(tmpdir(), "fake-log-")), "agy.log");
  const res = runFake(["--log-file", logFile, "-p", "x"], "noisy-log-success");
  assert.match(res.stdout, /fake\) reply/);
  const log = readFileSync(logFile, "utf8");
  assert.match(log, /ERROR: logging before google\.Init:/);
  assert.match(log, /You are not logged into Antigravity\./);
});

test("wrapped-quota writes a wrapper-prefixed quota line and prints nothing", () => {
  const logFile = join(mkdtempSync(join(tmpdir(), "fake-log-")), "agy.log");
  const res = runFake(["--log-file", logFile, "-p", "x"], "wrapped-quota");
  assert.equal(res.stdout, "");
  assert.equal(res.status, 0);
  const log = readFileSync(logFile, "utf8");
  assert.match(log, /ERROR: logging before google\.Init: E0827/);
  assert.match(log, /RESOURCE_EXHAUSTED/);
});
