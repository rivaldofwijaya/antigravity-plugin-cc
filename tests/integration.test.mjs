import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, chmodSync, writeFileSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const COMPANION = fileURLToPath(new URL("../plugins/antigravity/scripts/antigravity.mjs", import.meta.url));
const FAKE_AGY = fileURLToPath(new URL("./fake-agy.mjs", import.meta.url));

function run(args, { mode = "success", home } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), "agy-cwd-"));
  const env = {
    ...process.env,
    ANTIGRAVITY_CC_AGY_BIN: FAKE_AGY,
    ANTIGRAVITY_CC_HOME: home || mkdtempSync(join(tmpdir(), "agy-home-")),
    FAKE_AGY_MODE: mode,
  };
  const stdout = execFileSync("node", [COMPANION, ...args], { cwd, env, encoding: "utf8" });
  return { stdout, cwd, home: env.ANTIGRAVITY_CC_HOME };
}

before(() => {
  chmodSync(FAKE_AGY, 0o755);
});

test("setup --json reports ready when the (fake) binary resolves", () => {
  const { stdout } = run(["setup", "--json"]);
  const data = JSON.parse(stdout);
  assert.equal(data.ready, true);
  assert.equal(data.installed, true);
  assert.equal(data.version, "9.9.9-fake");
});

test("delegate (foreground success) returns the model response + conversation id", () => {
  const { stdout } = run(["delegate", "summarize the repo"], { mode: "success" });
  assert.match(stdout, /Antigravity \(fake\) reply/);
  assert.match(stdout, /summarize the repo/);
  assert.match(stdout, /Antigravity conversation:/);
  assert.match(stdout, /abcd1234-ef56-7890-abcd-1234567890ef/);
});

test("delegate surfaces quota exhaustion instead of returning empty (grounded behavior)", () => {
  const { stdout } = run(["delegate", "do something expensive"], { mode: "quota" });
  assert.match(stdout, /quota is exhausted/i);
  assert.match(stdout, /152h59m39s/);
});

test("delegate surfaces an auth error with sign-in guidance", () => {
  const { stdout } = run(["delegate", "anything"], { mode: "auth" });
  assert.match(stdout, /not authenticated/i);
  assert.match(stdout, /agy/);
});

test("status + result work across invocations sharing a home", () => {
  const home = mkdtempSync(join(tmpdir(), "agy-home-shared-"));
  run(["delegate", "remember me"], { mode: "success", home });
  // status lists the job
  const status = execFileSync(
    "node",
    [COMPANION, "status"],
    { cwd: mkdtempSync(join(tmpdir(), "agy-cwd-")), env: { ...process.env, ANTIGRAVITY_CC_HOME: home, ANTIGRAVITY_CC_AGY_BIN: FAKE_AGY }, encoding: "utf8" },
  );
  // jobs are filtered by cwd; with a fresh cwd there are none — assert the header renders.
  assert.match(status, /Antigravity — status/);
});

test("delegate with no task prompts for input", () => {
  const { stdout } = run(["delegate"]);
  assert.match(stdout, /What should Antigravity/);
});

test("unknown subcommand prints usage", () => {
  const { stdout } = run(["frobnicate"]);
  assert.match(stdout, /Usage: node antigravity\.mjs/);
});

test("missing binary yields install guidance", () => {
  // Isolate HOME so the real ~/.local/bin/agy fallback can't be found, and keep
  // only node's dir on PATH (so neither PATH nor well-known locations resolve agy).
  const cwd = mkdtempSync(join(tmpdir(), "agy-cwd-"));
  const isolatedHome = mkdtempSync(join(tmpdir(), "agy-nohome-"));
  const res = spawnSync(process.execPath, [COMPANION, "delegate", "x"], {
    cwd,
    encoding: "utf8",
    env: {
      ANTIGRAVITY_CC_AGY_BIN: "/nonexistent/agy",
      PATH: dirname(process.execPath),
      HOME: isolatedHome,
      USERPROFILE: isolatedHome,
    },
  });
  assert.match(res.stdout, /not installed/);
  assert.match(res.stdout, /install\.sh/);
});

// --- containment ------------------------------------------------------------
// Finding 2 / audit follow-up: `--read-only` was previously a pure alias for
// `--sandbox` — it added no flag and no instruction, so a run advertised as
// "look but don't touch" was nothing of the kind. Assertions read the stored job
// record, which holds the full prompt actually handed to agy.

function promptSentFor(args, { cwd } = {}) {
  const home = mkdtempSync(join(tmpdir(), "agy-home-"));
  const workdir = cwd || mkdtempSync(join(tmpdir(), "agy-cwd-"));
  const env = {
    ...process.env,
    ANTIGRAVITY_CC_AGY_BIN: FAKE_AGY,
    ANTIGRAVITY_CC_HOME: home,
    FAKE_AGY_MODE: "success",
  };
  execFileSync("node", [COMPANION, ...args], { cwd: workdir, env, encoding: "utf8" });

  const jobsDir = join(home, "jobs");
  const ids = readdirSync(jobsDir);
  assert.equal(ids.length, 1, "expected exactly one job record");
  return JSON.parse(readFileSync(join(jobsDir, ids[0], "meta.json"), "utf8")).prompt;
}

test("delegate --read-only injects an explicit no-write instruction into the prompt", () => {
  const prompt = promptSentFor(["delegate", "--read-only", "audit the config"]);
  assert.match(prompt, /READ-ONLY RUN/);
  assert.match(prompt, /Do not create, modify, move, or delete any file/);
  assert.match(prompt, /audit the config/, "the user's task must survive");
  assert.ok(
    prompt.indexOf("READ-ONLY RUN") < prompt.indexOf("audit the config"),
    "the directive must precede the task",
  );
});

test("delegate stays write-capable by default (no read-only preamble)", () => {
  const prompt = promptSentFor(["delegate", "refactor the parser"]);
  assert.doesNotMatch(prompt, /READ-ONLY RUN/);
  assert.equal(prompt, "refactor the parser");
});

test("review runs contained and carries the no-write instruction", () => {
  const cwd = mkdtempSync(join(tmpdir(), "agy-review-"));
  for (const args of [
    ["init", "-q"],
    ["config", "user.email", "t@t.t"],
    ["config", "user.name", "t"],
  ]) {
    spawnSync("git", args, { cwd });
  }
  writeFileSync(join(cwd, "a.txt"), "hello\n");
  spawnSync("git", ["add", "-A"], { cwd });
  spawnSync("git", ["commit", "-qm", "init"], { cwd });
  writeFileSync(join(cwd, "a.txt"), "hello world\n");

  const prompt = promptSentFor(["review"], { cwd });
  assert.match(prompt, /READ-ONLY RUN/);
  assert.match(prompt, /senior code reviewer/);
});
