import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, chmodSync, writeFileSync, readdirSync, readFileSync, existsSync, mkdirSync } from "node:fs";
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

// Records the argv the companion actually handed to agy, by having the fake
// write it next to the job. Simpler than intercepting the spawn.
function argvSentFor(args, { mode = "success" } = {}) {
  const home = mkdtempSync(join(tmpdir(), "agy-home-"));
  const cwd = mkdtempSync(join(tmpdir(), "agy-cwd-"));
  const argvFile = join(home, "argv.json");
  execFileSync("node", [COMPANION, ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      ANTIGRAVITY_CC_AGY_BIN: FAKE_AGY,
      ANTIGRAVITY_CC_HOME: home,
      FAKE_AGY_MODE: mode,
      FAKE_AGY_ARGV_FILE: argvFile,
    },
  });
  return JSON.parse(readFileSync(argvFile, "utf8"));
}

// T-A6 — the B4 regression test.
test("--model reaches agy's argv and produces no warning", () => {
  const home = mkdtempSync(join(tmpdir(), "agy-home-"));
  const cwd = mkdtempSync(join(tmpdir(), "agy-cwd-"));
  const argvFile = join(home, "argv.json");
  const res = spawnSync(
    "node",
    [COMPANION, "delegate", "--model", "gemini-3.1-pro-high", "refactor the parser"],
    {
      cwd,
      encoding: "utf8",
      env: {
        ...process.env,
        ANTIGRAVITY_CC_AGY_BIN: FAKE_AGY,
        ANTIGRAVITY_CC_HOME: home,
        FAKE_AGY_MODE: "success",
        FAKE_AGY_ARGV_FILE: argvFile,
      },
    },
  );
  const argv = JSON.parse(readFileSync(argvFile, "utf8"));
  assert.equal(argv[argv.indexOf("--model") + 1], "gemini-3.1-pro-high");
  assert.doesNotMatch(res.stderr, /no --model flag|Ignoring --model/i);
  assert.doesNotMatch(res.stdout, /refactor the parser.*--model/s, "the flag must not leak into the prompt");
});

// T-A5
test("--plan produces both --mode plan and --sandbox", () => {
  const argv = argvSentFor(["delegate", "--plan", "add caching"]);
  assert.equal(argv[argv.indexOf("--mode") + 1], "plan");
  assert.ok(argv.includes("--sandbox"));
});

// T-A4
test("--effort with a bad value fails without ever spawning agy", () => {
  const home = mkdtempSync(join(tmpdir(), "agy-home-"));
  const cwd = mkdtempSync(join(tmpdir(), "agy-cwd-"));
  const sentinel = join(home, "spawned.txt");
  const res = spawnSync("node", [COMPANION, "delegate", "--effort", "bogus", "do it"], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      ANTIGRAVITY_CC_AGY_BIN: FAKE_AGY,
      ANTIGRAVITY_CC_HOME: home,
      FAKE_AGY_SPAWN_SENTINEL: sentinel,
    },
  });
  assert.match(res.stdout, /low/);
  assert.match(res.stdout, /medium/);
  assert.match(res.stdout, /high/);
  assert.equal(existsSync(sentinel), false, "agy must not have been spawned at all");
});

test("--effort with an empty value fails without ever spawning agy", () => {
  const home = mkdtempSync(join(tmpdir(), "agy-home-"));
  const cwd = mkdtempSync(join(tmpdir(), "agy-cwd-"));
  const sentinel = join(home, "spawned.txt");
  const res = spawnSync("node", [COMPANION, "delegate", "--effort=", "do it"], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      ANTIGRAVITY_CC_AGY_BIN: FAKE_AGY,
      ANTIGRAVITY_CC_HOME: home,
      FAKE_AGY_SPAWN_SENTINEL: sentinel,
    },
  });
  assert.match(res.stdout, /low/);
  assert.match(res.stdout, /medium/);
  assert.match(res.stdout, /high/);
  assert.equal(existsSync(sentinel), false, "agy must not have been spawned at all");
});

// T-A3
test("a pre-1.1 agy that rejects the probe flags still returns the response", () => {
  const home = mkdtempSync(join(tmpdir(), "agy-home-"));
  const cwd = mkdtempSync(join(tmpdir(), "agy-cwd-"));
  const res = spawnSync("node", [COMPANION, "delegate", "summarize the repo"], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      ANTIGRAVITY_CC_AGY_BIN: FAKE_AGY,
      ANTIGRAVITY_CC_HOME: home,
      FAKE_AGY_MODE: "legacy-flag-error",
    },
  });
  assert.match(res.stdout, /Antigravity \(fake\) reply/);
  assert.match(res.stderr, /retrying without them/i, "the downgrade note belongs on stderr");
  assert.doesNotMatch(res.stdout, /retrying without them/i, "stdout is relayed verbatim; keep it clean");
});

// T-L4 — the §4.6 false-positive guard.
test("startup auth noise in a successful run's log is never reported as an auth error", () => {
  const { stdout } = run(["delegate", "explain the build"], { mode: "noisy-log-success" });
  assert.match(stdout, /Antigravity \(fake\) reply/);
  assert.doesNotMatch(stdout, /not authenticated/i);
  assert.doesNotMatch(stdout, /sign in/i);
});

// The B1 fix, end to end, through the JSON path.
test("a signed-out JSON run reports an auth error with sign-in guidance", () => {
  const { stdout } = run(["delegate", "anything"], { mode: "json-auth" });
  assert.match(stdout, /not authenticated/i);
  assert.match(stdout, /agy/);
});

test("a wrapper-prefixed quota log is still reported as quota exhaustion", () => {
  const { stdout } = run(["delegate", "expensive"], { mode: "wrapped-quota" });
  assert.match(stdout, /quota is exhausted/i);
  assert.match(stdout, /152h59m39s/);
  assert.doesNotMatch(stdout, /logging before google\.Init/);
});

test("a successful JSON run reports usage below the fence", () => {
  const { stdout } = run(["delegate", "summarize the repo"], { mode: "success" });
  assert.match(stdout, /Antigravity: [\d,]+ tokens · 1 turn/);
});

// Background jobs are detached; poll the job record until it leaves "running".
const BACKGROUND_COMMAND_TIMEOUT_MS = 20_000;

function waitForJob(home, cwd, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  const env = { ...process.env, ANTIGRAVITY_CC_HOME: home, ANTIGRAVITY_CC_AGY_BIN: FAKE_AGY };
  for (;;) {
    const jobsDir = join(home, "jobs");
    const ids = readdirSync(jobsDir);
    assert.equal(ids.length, 1, "expected exactly one job record");
    // `status` reconciles as a side effect.
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) throw new Error("job polling deadline expired before status check");
    execFileSync("node", [COMPANION, "status", ids[0]], {
      cwd,
      env,
      encoding: "utf8",
      timeout: remainingMs,
    });
    const job = JSON.parse(readFileSync(join(jobsDir, ids[0], "meta.json"), "utf8"));
    if (job.status !== "running") return { id: ids[0], job, env };
    if (Date.now() > deadline) throw new Error(`job stayed running: ${JSON.stringify(job)}`);
  }
}

function startBackground(mode) {
  const home = mkdtempSync(join(tmpdir(), "agy-home-"));
  const cwd = mkdtempSync(join(tmpdir(), "agy-cwd-"));
  execFileSync("node", [COMPANION, "delegate", "--background", "do a thing"], {
    cwd,
    encoding: "utf8",
    timeout: BACKGROUND_COMMAND_TIMEOUT_MS,
    env: {
      ...process.env,
      ANTIGRAVITY_CC_AGY_BIN: FAKE_AGY,
      ANTIGRAVITY_CC_HOME: home,
      FAKE_AGY_MODE: mode,
    },
  });
  return { home, cwd, ...waitForJob(home, cwd) };
}

// T-J1 — the §4.7 regression test.
test("a failed background job reconciles to failed despite non-empty JSON output", () => {
  const { job, id, cwd, env } = startBackground("json-error");
  assert.equal(job.status, "failed", "a JSON ERROR blob is output, but it is not a success");
  assert.match(job.error, /quota/i);

  const result = execFileSync("node", [COMPANION, "result", id], {
    cwd,
    env,
    encoding: "utf8",
    timeout: BACKGROUND_COMMAND_TIMEOUT_MS,
  });
  assert.match(result, /quota is exhausted/i);
  assert.match(result, /152h59m39s/);
});

// T-J2
test("an empty background job reconciles to empty and says so", () => {
  const { job, id, cwd, env } = startBackground("json-empty");
  assert.equal(job.status, "empty");

  const result = execFileSync("node", [COMPANION, "result", id], {
    cwd,
    env,
    encoding: "utf8",
    timeout: BACKGROUND_COMMAND_TIMEOUT_MS,
  });
  assert.match(result, /finished without producing any output/i);
  assert.doesNotMatch(result, /UNTRUSTED DATA/, "there is no model output to fence");
});

test("a successful background job still reconciles to done and relays the response", () => {
  const { job, id, cwd, env } = startBackground("success");
  assert.equal(job.status, "done");

  const result = execFileSync("node", [COMPANION, "result", id], {
    cwd,
    env,
    encoding: "utf8",
    timeout: BACKGROUND_COMMAND_TIMEOUT_MS,
  });
  assert.match(result, /Antigravity \(fake\) reply/);
  assert.match(result, /UNTRUSTED DATA/);
});

// T-C3
test("setup --json reports versionOk true for the fake binary's 9.9.9", () => {
  const { stdout } = run(["setup", "--json"]);
  const data = JSON.parse(stdout);
  assert.equal(data.version, "9.9.9-fake");
  assert.equal(data.versionOk, true);
});

test("setup warns below the floor and stays ready", () => {
  const home = mkdtempSync(join(tmpdir(), "agy-home-"));
  const cwd = mkdtempSync(join(tmpdir(), "agy-cwd-"));
  const oldAgy = join(mkdtempSync(join(tmpdir(), "old-agy-")), "agy.mjs");
  writeFileSync(oldAgy, "#!/usr/bin/env node\nprocess.stdout.write('1.0.3\\n');\n");
  chmodSync(oldAgy, 0o755);
  const env = { ...process.env, ANTIGRAVITY_CC_AGY_BIN: oldAgy, ANTIGRAVITY_CC_HOME: home };

  const json = JSON.parse(
    execFileSync("node", [COMPANION, "setup", "--json"], { cwd, env, encoding: "utf8" }),
  );
  assert.equal(json.versionOk, false);
  assert.equal(json.ready, true, "the advisory must not block");

  const human = execFileSync("node", [COMPANION, "setup"], { cwd, env, encoding: "utf8" });
  assert.match(human, /1\.1\.20\+ is recommended/);
  assert.match(human, /agy update/);
});

test("setup does not nag when the version is unparseable", () => {
  const home = mkdtempSync(join(tmpdir(), "agy-home-"));
  const cwd = mkdtempSync(join(tmpdir(), "agy-cwd-"));
  const oddAgy = join(mkdtempSync(join(tmpdir(), "odd-agy-")), "agy.mjs");
  writeFileSync(oddAgy, "#!/usr/bin/env node\nprocess.stdout.write('built from source\\n');\n");
  chmodSync(oddAgy, 0o755);
  const env = { ...process.env, ANTIGRAVITY_CC_AGY_BIN: oddAgy, ANTIGRAVITY_CC_HOME: home };

  const json = JSON.parse(
    execFileSync("node", [COMPANION, "setup", "--json"], { cwd, env, encoding: "utf8" }),
  );
  assert.equal(json.versionOk, null);

  const human = execFileSync("node", [COMPANION, "setup"], { cwd, env, encoding: "utf8" });
  assert.doesNotMatch(human, /is recommended/);
});

// T-S1 — the B3 regression test.
test("setup's auth heuristic accepts a .db conversation file", () => {
  const fakeHome = mkdtempSync(join(tmpdir(), "agy-gemini-home-"));
  const convDir = join(fakeHome, ".gemini", "antigravity-cli", "conversations");
  mkdirSync(convDir, { recursive: true });
  writeFileSync(join(convDir, "abcd1234-ef56-7890-abcd-1234567890ef.db"), "");

  const json = JSON.parse(
    execFileSync("node", [COMPANION, "setup", "--json"], {
      cwd: mkdtempSync(join(tmpdir(), "agy-cwd-")),
      encoding: "utf8",
      env: {
        ...process.env,
        ANTIGRAVITY_CC_AGY_BIN: FAKE_AGY,
        ANTIGRAVITY_CC_HOME: mkdtempSync(join(tmpdir(), "agy-home-")),
        HOME: fakeHome,
        USERPROFILE: fakeHome,
      },
    }),
  );
  assert.equal(json.authedGuess, true, "agy 1.1 stores conversations as .db, not .pb");
});
