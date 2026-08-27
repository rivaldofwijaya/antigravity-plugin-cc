#!/usr/bin/env node
// Antigravity companion for Claude Code.
//
// Thin, dependency-free runtime that drives the `agy` CLI (Google Antigravity)
// in print mode and manages background jobs. Each subcommand prints
// Markdown that the calling slash command / subagent relays to the user verbatim.
//
// Subcommands: setup | delegate | review | resume | status | result | cancel
//   (aliases: run -> delegate)

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { parseArgs, hasFlag, VALID_EFFORTS } from "./lib/args.mjs";
import { resolveAgyBinary, agyConfigDir } from "./lib/paths.mjs";
import {
  READ_ONLY_PREAMBLE,
  buildPrintArgs,
  runForeground,
  spawnBackground,
  goDurationToMs,
  agyVersion,
  readLogSafe,
} from "./lib/agy.mjs";
import { classifyRun } from "./lib/result.mjs";
import { resolveReviewTarget } from "./lib/git.mjs";
import { MIN_RECOMMENDED_AGY, isVersionOk } from "./lib/capabilities.mjs";
import {
  createJob,
  writeJob,
  readJob,
  reconcile,
  listJobs,
  latestJob,
  cancelJob,
  statusForOutcome,
} from "./lib/jobs.mjs";
import * as render from "./lib/render.mjs";

const MAX_PROMPT_BYTES = 100 * 1024;

function out(text) {
  process.stdout.write(text.endsWith("\n") ? text : `${text}\n`);
}

function requireBinaryOrExit() {
  const bin = resolveAgyBinary();
  if (!bin) {
    out(render.renderNotInstalled());
    process.exit(0);
  }
  return bin;
}

function clampPrompt(prompt) {
  const buf = Buffer.from(prompt, "utf8");
  if (buf.length <= MAX_PROMPT_BYTES) return prompt;
  return `${buf.subarray(0, MAX_PROMPT_BYTES).toString("utf8")}\n\n[...truncated by antigravity-plugin-cc: prompt exceeded ${MAX_PROMPT_BYTES} bytes...]`;
}

// ---------------------------------------------------------------------------
// setup
// ---------------------------------------------------------------------------
function cmdSetup(parsed) {
  const bin = resolveAgyBinary();
  const configDir = agyConfigDir();
  const configExists = existsSync(configDir);
  const installationId = existsSync(join(configDir, "installation_id"));
  // agy 1.1 stores conversations as `<uuid>.db`; 1.0 used `.pb`. Accept both —
  // an old thread is still evidence of a completed sign-in.
  const hasConversations =
    existsSync(join(configDir, "conversations")) &&
    safeReaddir(join(configDir, "conversations")).some((f) => f.endsWith(".db") || f.endsWith(".pb"));

  const version = bin ? agyVersion(bin.path) : null;
  const versionOk = bin ? isVersionOk(version) : null;
  // Best-effort auth signal: we never log you in. Presence of prior threads or an
  // installation id strongly suggests a completed sign-in.
  const authedGuess = configExists && (installationId || hasConversations);

  const report = {
    ready: Boolean(bin),
    binary: { found: Boolean(bin), detail: bin ? `${bin.path} (${bin.source})` : "not found" },
    version,
    configDir: { exists: configExists, detail: configExists ? configDir : `${configDir} (missing)` },
    auth: {
      detail: !bin
        ? "n/a (install agy first)"
        : authedGuess
          ? "looks configured (a prior signed-in session was found)"
          : "no prior session detected — run `! agy` once to sign in",
    },
    nextSteps: [],
  };

  if (!bin) {
    report.nextSteps.push("Install agy (see the install block below), then rerun `/antigravity:setup`.");
  } else if (!authedGuess) {
    report.nextSteps.push("Run `! agy` once to complete the browser sign-in, then you're ready.");
  } else {
    report.nextSteps.push("You're set. Try `/antigravity:review` or `/antigravity:delegate <task>`.");
  }

  if (versionOk === false) {
    report.nextSteps.push(
      `Your \`agy\` is ${version}; ${MIN_RECOMMENDED_AGY}+ is recommended for accurate failure reporting. Update with \`agy update\`.`,
    );
  }

  if (hasFlag(parsed, "json")) {
    out(
      JSON.stringify(
        {
          ready: report.ready,
          installed: report.binary.found,
          binaryPath: bin?.path ?? null,
          version,
          versionOk,
          authedGuess,
          configDir,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (!bin) {
    out(render.renderNotInstalled());
    return;
  }
  out(render.renderSetup(report));
}

function safeReaddir(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// delegate / resume (shared core)
// ---------------------------------------------------------------------------
function runAgyTask(parsed, { kind, title, prompt, readOnly, resume }) {
  const hasEffort = Object.hasOwn(parsed.valued, "effort");
  const effort = hasEffort ? parsed.valued.effort : null;
  if (hasEffort && !VALID_EFFORTS.has(effort)) {
    // Fail here rather than paying for an agy round-trip on a typo.
    out(
      render.renderCompanionError(kind, [
        `\`--effort ${effort}\` is not a valid reasoning level.`,
        "",
        "Use one of `low`, `medium`, `high`.",
      ]),
    );
    return;
  }

  const bin = requireBinaryOrExit();
  const cwd = process.cwd();

  const plan = hasFlag(parsed, "plan");
  // `--plan` asks agy for a plan instead of a change, so it is contained too.
  // `--read-only` deliberately does NOT imply plan mode: plan mode changes what
  // the agent produces, and "explain how X works" wants prose, not a plan.
  const sandbox = hasFlag(parsed, "sandbox") || Boolean(readOnly) || plan;
  // Write-capable by default for a delegate the user explicitly asked for; agy
  // needs --dangerously-skip-permissions to act at all in print mode. The
  // unprompted path is closed in the subagent, not here.
  const yolo = !hasFlag(parsed, "no-yolo");
  const continueLast = resume && !parsed.valued.conversation ? true : hasFlag(parsed, "continue");
  const conversationId = parsed.valued.conversation || null;
  const printTimeout = parsed.valued["print-timeout"] || "10m";
  const addDirs = [cwd, ...(parsed.repeated["add-dir"] || [])];
  // Passed through unvalidated: agy's own rejection message enumerates every
  // available model, which beats any list we could hardcode and maintain.
  const model = parsed.valued.model || null;

  // A contained run gets its no-write directive prepended BEFORE clamping, so the
  // instruction survives even when a large prompt is truncated from the tail.
  const finalPrompt = clampPrompt(readOnly ? `${READ_ONLY_PREAMBLE}\n${prompt}` : prompt);
  const background = hasFlag(parsed, "background");

  const job = createJob({ kind, title, prompt: finalPrompt, cwd, conversationId });
  const args = buildPrintArgs({
    prompt: finalPrompt,
    addDirs,
    yolo,
    sandbox,
    continueLast,
    conversationId,
    logFile: job.paths.log,
    printTimeout,
    model,
    effort,
    mode: plan ? "plan" : undefined,
  });

  if (background) {
    const { pid } = spawnBackground({
      bin: bin.path,
      args,
      cwd,
      outputFile: job.paths.output,
      errFile: job.paths.err,
    });
    job.pid = pid;
    writeJob(job);
    out(render.renderBackgroundStarted(job));
    return;
  }

  const watchdogMs = goDurationToMs(printTimeout) + 60_000;
  const result = runForeground({ bin: bin.path, args, cwd, logFile: job.paths.log, watchdogMs });
  const run = classifyRun({
    stdout: result.stdout,
    logText: result.logText,
    timedOut: result.timedOut,
    printTimeout,
  });

  job.conversationId = run.conversationId || job.conversationId;
  job.status = statusForOutcome(run.outcome);
  job.error = run.error
    ? run.error.message + (run.error.resetsIn ? ` (resets in ${run.error.resetsIn})` : "")
    : null;
  job.finishedAt = new Date().toISOString();
  writeJob(job);

  const meta = { title, conversationId: job.conversationId, logFile: job.paths.log };
  if (run.outcome === "success") {
    out(
      render.renderResponse(run.responseText, {
        ...meta,
        usage: run.usage,
        durationSeconds: run.durationSeconds,
        numTurns: run.numTurns,
      }),
    );
  } else if (run.outcome === "empty") {
    out(render.renderEmpty(meta));
  } else {
    out(render.renderError(run.error, meta));
  }
}

function cmdDelegate(parsed) {
  const task = parsed.text;
  if (!task) {
    out("# 🛰️ Antigravity — delegate\n\nWhat should Antigravity work on? Pass the task, e.g.\n`/antigravity:delegate investigate why the auth tests fail and propose a fix`.");
    return;
  }
  runAgyTask(parsed, { kind: "delegate", title: truncate(task, 80), prompt: task, readOnly: hasFlag(parsed, "read-only") });
}

function cmdResume(parsed) {
  const followUp = parsed.text || "Continue from where you left off.";
  runAgyTask(parsed, {
    kind: "delegate",
    title: truncate(followUp, 80),
    prompt: followUp,
    resume: true,
  });
}

// ---------------------------------------------------------------------------
// review
// ---------------------------------------------------------------------------
function cmdReview(parsed) {
  requireBinaryOrExit();
  const cwd = process.cwd();
  const base = parsed.valued.base || null;
  const focus = parsed.text;

  const target = resolveReviewTarget(cwd, base);
  if (!target.ok) {
    out(`# 🛰️ Antigravity — review\n\nNothing to review: ${target.reason}.`);
    return;
  }

  const prompt = buildReviewPrompt(target, focus);
  // Reviews are contained + read-capable but should not modify the tree.
  const reviewParsed = { ...parsed, flags: { ...parsed.flags, sandbox: true } };
  runAgyTask(reviewParsed, {
    kind: "review",
    title: `review ${target.label}`,
    prompt,
    readOnly: true,
  });
}

function buildReviewPrompt(target, focus) {
  return [
    "You are a meticulous senior code reviewer. Review ONLY the changes below. Do not modify any files.",
    focus ? `\nReviewer focus: ${focus}` : "",
    "\nReturn a concise review with:",
    "1. Verdict (ship / ship with nits / needs work).",
    "2. The most important issues first, each as: severity (critical/high/medium/low), file:line, what's wrong, and a concrete fix.",
    "3. Anything risky around correctness, security, error handling, concurrency, or data loss.",
    "4. A short list of suggested next steps.",
    `\nReview target: ${target.label}`,
    target.stat ? `\nDiffstat:\n${target.stat}` : "",
    "\nUnified diff:\n",
    "```diff",
    target.diff,
    "```",
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------------------
// status / result / cancel
// ---------------------------------------------------------------------------
function cmdStatus(parsed) {
  const id = parsed.positionals.find((p) => p.startsWith("agy-"));
  if (id) {
    const job = readJob(id);
    if (!job) {
      out(`# 🛰️ Antigravity — status\n\nNo job \`${id}\` found.`);
      return;
    }
    reconcile(job);
    out(render.renderJobStatus(job));
    return;
  }
  out(render.renderStatus(listJobs(process.cwd())));
}

function cmdResult(parsed) {
  const id = parsed.positionals.find((p) => p.startsWith("agy-"));
  let job = id ? readJob(id) : latestJob(process.cwd());
  if (!job) {
    out(`# 🛰️ Antigravity — result\n\nNo ${id ? `job \`${id}\`` : "recent jobs"} found for this repository.`);
    return;
  }
  reconcile(job);
  if (job.status === "running") {
    out(render.renderJobStatus(job));
    return;
  }

  const run = classifyRun({
    stdout: readLogSafe(job.paths.output),
    logText: readLogSafe(job.paths.log),
    timedOut: false,
  });
  const meta = {
    title: job.title,
    conversationId: job.conversationId || run.conversationId,
    logFile: job.paths.log,
    jobId: job.id,
  };

  if (job.status === "cancelled") {
    out(render.renderJobStatus(job));
  } else if (run.outcome === "success") {
    out(
      render.renderResponse(run.responseText, {
        ...meta,
        usage: run.usage,
        durationSeconds: run.durationSeconds,
        numTurns: run.numTurns,
      }),
    );
  } else if (run.outcome === "empty") {
    out(render.renderEmpty(meta));
  } else {
    out(render.renderError(run.error, meta));
  }
}

function cmdCancel(parsed) {
  const id = parsed.positionals.find((p) => p.startsWith("agy-"));
  const job = id ? readJob(id) : listJobs(process.cwd()).find((j) => j.status === "running");
  if (!job) {
    out(`# 🛰️ Antigravity — cancel\n\nNo running job ${id ? `\`${id}\`` : ""} to cancel.`);
    return;
  }
  const result = cancelJob(job);
  out(render.renderCancel(result, job));
}

// ---------------------------------------------------------------------------
function truncate(s, n) {
  const t = String(s).replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function usage() {
  out(
    [
      "antigravity companion — drive the Antigravity CLI (agy) from Claude Code",
      "",
      "Usage: node antigravity.mjs <subcommand> [args]",
      "  setup [--json]",
      "  delegate <task> [--background] [--sandbox] [--read-only] [--plan] [--continue]",
      "           [--conversation <id>] [--add-dir <p>] [--print-timeout <dur>]",
      "           [--model <id>] [--effort low|medium|high]",
      "  review [--base <ref>] [--background] [focus text...]",
      "  resume <follow-up> [--conversation <id>] [--background]",
      "  status [job-id]",
      "  result [job-id]",
      "  cancel [job-id]",
    ].join("\n"),
  );
}

function main() {
  const [, , sub, ...rest] = process.argv;
  const parsed = parseArgs(rest);
  switch (sub) {
    case "setup":
      return cmdSetup(parsed);
    case "delegate":
    case "run":
    case "task":
      return cmdDelegate(parsed);
    case "review":
      return cmdReview(parsed);
    case "resume":
      return cmdResume(parsed);
    case "status":
      return cmdStatus(parsed);
    case "result":
      return cmdResult(parsed);
    case "cancel":
      return cmdCancel(parsed);
    default:
      return usage();
  }
}

main();
