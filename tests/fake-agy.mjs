#!/usr/bin/env node
// Test fixture that imitates real `agy` print-mode behavior (verified against
// 1.1.21) closely enough to exercise the companion end-to-end without auth or
// quota.
//
// Modes via FAKE_AGY_MODE env:
//   success (default)  -> conversation id to --log-file, prints a response
//   quota              -> 1.0-style glog RESOURCE_EXHAUSTED in the log, empty stdout, exit 0
//   auth               -> 1.0-style glog UNAUTHENTICATED in the log, empty stdout, exit 0
//   json-error         -> {"status":"ERROR", error: quota...}, exit 0
//   json-empty         -> {"status":"SUCCESS", response: ""}, exit 0
//   json-auth          -> {"status":"ERROR", error: signed-out...}, exit 0
//   legacy-flag-error  -> rejects --output-format like a pre-1.1 binary (exit 2),
//                         behaves as `success` once the flag is gone
//   flag-error-stdout  -> rejects --output-format with non-empty stdout (exit 2),
//                         behaves as `success` once the flag is gone
//   noisy-log-success  -> text success PLUS 1.1 startup auth noise in the log
//   wrapped-quota      -> empty stdout, 1.1 wrapper-prefixed quota line in the log
//   broken-binary      -> rejects --output-format like legacy-flag-error, but ALSO
//                         rejects the post-downgrade retry (empty stdout, exit 126,
//                         "permission denied" on stderr both times)
//   json-model-error   -> {"status":"ERROR", error: agy's REAL multi-line
//                         model-selection error, verified live on 1.1.21}, exit 0
//
// The JSON modes emit JSON only when `--output-format json` is on the argv, so a
// single mode exercises both the JSON and the legacy text path.

import { writeFileSync } from "node:fs";

const argv = process.argv.slice(2);

// Test hooks: record the argv we were handed, and prove we ran at all.
// `writeFileSync` is already imported at the top of this file.
if (process.env.FAKE_AGY_ARGV_FILE) {
  writeFileSync(process.env.FAKE_AGY_ARGV_FILE, JSON.stringify(argv, null, 2));
}
if (process.env.FAKE_AGY_SPAWN_SENTINEL) {
  writeFileSync(process.env.FAKE_AGY_SPAWN_SENTINEL, "spawned\n");
}

if (argv.includes("--version")) {
  process.stdout.write("9.9.9-fake\n");
  process.exit(0);
}

function valueOf(flag) {
  const i = argv.indexOf(flag);
  return i !== -1 ? argv[i + 1] : null;
}

const logFile = valueOf("--log-file");
// prompt is the last token (companion always puts `-p <prompt>` last)
const prompt = argv[argv.length - 1];
const convId = "abcd1234-ef56-7890-abcd-1234567890ef";
const mode = process.env.FAKE_AGY_MODE || "success";
const wantsJson = valueOf("--output-format") === "json";

const baseLog = `I0101 00:00:00.000000 1 server.go:755] Created conversation ${convId}\nI0101 00:00:00.000001 1 printmode.go:130] Print mode: conversation=${convId}, sending message\n`;

// Real 1.1.21 wrapper: the whole glog line is itself prefixed by Go's
// pre-initialisation logger.
const WRAPPER = "ERROR: logging before google.Init: ";
const STAMP = "E0827 03:04:06.823240      80 errorreport.go:223] ";

function writeLog(text) {
  if (logFile) writeFileSync(logFile, text);
}

function usage(outputTokens) {
  return {
    input_tokens: 14549,
    output_tokens: outputTokens,
    thinking_tokens: 0,
    cache_read_tokens: 0,
    total_tokens: 14549 + outputTokens,
  };
}

function emitJson(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
  process.exit(0);
}

function replyText() {
  const echo = String(prompt || "").slice(0, 60).replace(/\s+/g, " ");
  return `Antigravity (fake) reply. I received: "${echo}". Verdict: looks good.\n`;
}

function succeed() {
  writeLog(baseLog);
  if (wantsJson) {
    emitJson({
      conversation_id: convId,
      status: "SUCCESS",
      response: replyText(),
      duration_seconds: 2.135746,
      num_turns: 1,
      usage: usage(1),
    });
  }
  process.stdout.write(replyText());
  process.exit(0);
}

if (mode === "legacy-flag-error" && wantsJson) {
  process.stderr.write("flag provided but not defined: -output-format\n");
  process.exit(2);
}

if (mode === "legacy-flag-error") succeed();

if (mode === "flag-error-stdout" && wantsJson) {
  process.stdout.write("partial output before flag rejection\n");
  process.stderr.write("flag provided but not defined: -output-format\n");
  process.exit(2);
}

if (mode === "flag-error-stdout") succeed();

// A binary broken enough that even the post-downgrade retry fails, with empty
// stdout both times — exercises the foreground "empty stdout, but the process
// reported a recognizable invocation failure" shape end-to-end (Finding 2).
if (mode === "broken-binary" && wantsJson) {
  process.stderr.write("flag provided but not defined: -output-format\n");
  process.exit(2);
}
if (mode === "broken-binary") {
  process.stderr.write("permission denied\n");
  process.exit(126);
}

if (mode === "quota") {
  writeLog(
    baseLog +
      "E0101 00:00:00.000002 1 log.go:398] agent executor error: RESOURCE_EXHAUSTED (code 429): Individual quota reached. Contact your administrator to enable overages. Resets in 152h59m39s.\n",
  );
  process.exit(0); // empty stdout, exit 0 — exactly like the real CLI
}

if (mode === "auth") {
  writeLog("E0101 00:00:00.000002 1 log.go:398] UNAUTHENTICATED (code 401): login required\n");
  process.exit(0);
}

if (mode === "wrapped-quota") {
  writeLog(
    baseLog +
      `${WRAPPER}${STAMP}agent executor error: RESOURCE_EXHAUSTED (code 429): Individual quota reached. Contact your administrator to enable overages. Resets in 152h59m39s.\n` +
      `${WRAPPER}${STAMP}RESOURCE_EXHAUSTED (code 429): Individual quota reached. Contact your administrator to enable overages. Resets in 152h59m39s.\n`,
  );
  process.exit(0);
}

if (mode === "noisy-log-success") {
  // A REAL signed-in 1.1.21 run logs this during startup, before the keyring
  // resolves. The companion must not report it as an auth failure.
  writeLog(
    `${WRAPPER}${STAMP}error getting token source: You are not logged into Antigravity.\n` +
      `${WRAPPER}${STAMP}You are not logged into Antigravity.\n` +
      baseLog,
  );
  if (wantsJson) {
    emitJson({
      conversation_id: convId,
      status: "SUCCESS",
      response: replyText(),
      duration_seconds: 2.1,
      num_turns: 1,
      usage: usage(1),
    });
  }
  process.stdout.write(replyText());
  process.exit(0);
}

if (mode === "json-error") {
  writeLog(baseLog);
  if (wantsJson) {
    emitJson({
      conversation_id: "",
      status: "ERROR",
      response: "",
      error:
        "RESOURCE_EXHAUSTED (code 429): Individual quota reached. Contact your administrator to enable overages. Resets in 152h59m39s.",
      duration_seconds: 0,
      num_turns: 0,
      usage: usage(0),
    });
  }
  process.exit(0);
}

if (mode === "json-empty") {
  writeLog(baseLog);
  if (wantsJson) {
    emitJson({
      conversation_id: convId,
      status: "SUCCESS",
      response: "",
      duration_seconds: 1.5,
      num_turns: 1,
      usage: usage(0),
    });
  }
  process.exit(0);
}

if (mode === "json-model-error") {
  writeLog(baseLog);
  if (wantsJson) {
    emitJson({
      conversation_id: "",
      status: "ERROR",
      response: "",
      error:
        'invalid model selection (--model "no-such-model" --effort ""): model no-such-model is\n' +
        "not recognized as a known model or custom model in settings\n" +
        "Available models:\n" +
        "  Gemini 3.7 Flash (High)\n" +
        "  Gemini 3.7 Flash (Medium)\n" +
        "  Gemini 3.6 Flash (High)\n" +
        "  Claude Sonnet 4.6\n" +
        "  Claude Opus 4.6 (Thinking)\n" +
        "  GPT-OSS 120B (Medium)",
      duration_seconds: 0,
      num_turns: 0,
      usage: usage(0),
    });
  }
  process.exit(0);
}

if (mode === "json-auth") {
  writeLog(baseLog);
  if (wantsJson) {
    emitJson({
      conversation_id: "",
      status: "ERROR",
      response: "",
      error: "error getting token source: You are not logged into Antigravity.",
      duration_seconds: 0,
      num_turns: 0,
      usage: usage(0),
    });
  }
  process.exit(0);
}

succeed();
