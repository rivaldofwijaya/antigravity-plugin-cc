// Normalise one `agy` print-mode run into a single shape, whatever produced it.
//
// agy 1.1 added `--output-format json`, which reports the outcome directly —
// including on failure, where it STILL exits 0. That is now the primary path.
// The log-scraping path is kept as a fallback for a pre-1.1 binary, or for a run
// whose stdout is not parseable JSON.
//
// Verified against agy 1.1.21 on 2026-08-27.

import { scanAgyLog, classifyErrorText } from "./logscan.mjs";

/**
 * @typedef {Object} RunResult
 * @property {"success"|"empty"|"failed"} outcome
 * @property {string}  responseText      // "" when none
 * @property {string|null} conversationId
 * @property {{kind:"quota"|"auth"|"backend"|"timeout", message:string, resetsIn:string|null}|null} error
 * @property {{inputTokens:number, outputTokens:number, thinkingTokens:number,
 *             cacheReadTokens:number, totalTokens:number}|null} usage
 * @property {number|null} durationSeconds
 * @property {number|null} numTurns
 * @property {"json"|"log"} source        // which path produced this
 */

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// agy assigns conversation ids as UUIDs. Validating the shape before it is
// ever rendered means a value that reached here through a corrupted or
// downgraded run cannot smuggle arbitrary text into the "reopen in the TUI"
// footer line, which sits OUTSIDE the untrusted-output fence.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normaliseConversationId(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return UUID_RE.test(trimmed) ? trimmed : null;
}

// A stderr line that means the invocation itself never produced a real
// response — not a normal program's own error output. Modelled directly on
// FLAG_REJECTION_RE in agy.mjs: we do not trust the exit code (agy exits 0 on
// its own failures and a foreign nonzero exit is equally unreliable in the
// other direction), only an unambiguous, narrow stderr pattern.
const INVOCATION_FAILURE_RE =
  /flag provided but not defined|not defined: --|unknown flag|invalid flag|panic:|no such file or directory|permission denied|command not found/i;

/**
 * Recognise a process-level invocation failure from stderr / a spawn error.
 * Returns null when nothing recognisable is present — the caller must then
 * trust whatever stdout/the log already said, exit code included.
 *
 * @param {{stderr?: string, code?: number|null, spawnError?: string}} input
 * @returns {{kind:"backend", message:string, resetsIn:null}|null}
 */
function classifyProcessFailure({ stderr, code, spawnError }) {
  if (spawnError) {
    return {
      kind: "backend",
      message: `Antigravity could not be started: ${spawnError}`,
      resetsIn: null,
    };
  }
  const text = typeof stderr === "string" ? stderr.trim() : "";
  if (!text || !INVOCATION_FAILURE_RE.test(text)) return null;
  // A background job has no captured exit code (the process is detached), so
  // `code` is undefined there and this check is skipped. When we DO have one
  // and it is exactly 0, a clean exit alongside stray stderr noise that merely
  // resembles the pattern is not treated as a failure.
  if (typeof code === "number" && code === 0) return null;
  const firstLine = text.split(/\r?\n/).find((l) => l.trim()) || text;
  return { kind: "backend", message: firstLine.trim(), resetsIn: null };
}

/**
 * Parse agy's JSON result off stdout. Two-stage: the whole stream first, then
 * the last line that looks like an object — agy can interleave log noise on the
 * same stream. Returns null rather than throwing on anything unparseable.
 *
 * @param {string} stdout
 * @returns {object|null}
 */
export function parseAgyJson(stdout) {
  const text = typeof stdout === "string" ? stdout.trim() : "";
  if (!text) return null;

  try {
    const value = JSON.parse(text);
    if (isPlainObject(value)) return value;
  } catch {
    /* fall through to the line scan */
  }

  const candidates = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{") && line.endsWith("}"));

  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    try {
      const value = JSON.parse(candidates[i]);
      if (isPlainObject(value)) return value;
    } catch {
      /* keep looking backwards */
    }
  }

  return null;
}

function num(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normaliseUsage(usage) {
  if (!isPlainObject(usage)) return null;
  const field = (key) => (typeof usage[key] === "number" && Number.isFinite(usage[key]) ? usage[key] : 0);
  return {
    inputTokens: field("input_tokens"),
    outputTokens: field("output_tokens"),
    thinkingTokens: field("thinking_tokens"),
    cacheReadTokens: field("cache_read_tokens"),
    totalTokens: field("total_tokens"),
  };
}

/**
 * Map an `agy --output-format json` object to a RunResult.
 * Every field is optional: an unrecognised shape must degrade, not throw.
 *
 * @param {object} json
 * @returns {RunResult}
 */
export function fromJson(json) {
  const base = {
    conversationId: normaliseConversationId(json.conversation_id),
    usage: normaliseUsage(json.usage),
    durationSeconds: num(json.duration_seconds),
    numTurns: num(json.num_turns),
    source: "json",
  };

  const responseText = typeof json.response === "string" ? json.response.trim() : "";

  if (json.status === "SUCCESS") {
    return responseText
      ? { ...base, outcome: "success", responseText, error: null }
      : { ...base, outcome: "empty", responseText: "", error: null };
  }

  const rawError = json.error || json.status || "";
  const error = classifyErrorText(rawError) || {
    kind: "backend",
    message: "Antigravity reported a failure with no error text.",
    resetsIn: null,
  };
  return { ...base, outcome: "failed", responseText, error };
}

/**
 * Map a pre-1.1 style run — plain-text stdout plus an agy log file — to a
 * RunResult. The log is consulted for an error ONLY when there is no response
 * text; see the false-positive note in logscan.mjs.
 *
 * @param {{stdout: string, logText: string}} input
 * @returns {RunResult}
 */
export function fromLegacy({ stdout, logText }) {
  const responseText = typeof stdout === "string" ? stdout.trim() : "";
  const scan = scanAgyLog(logText || "");
  const base = {
    conversationId: scan.conversationId,
    usage: null,
    durationSeconds: null,
    numTurns: null,
    source: "log",
  };

  if (responseText) return { ...base, outcome: "success", responseText, error: null };
  if (scan.error) return { ...base, outcome: "failed", responseText: "", error: scan.error };
  return { ...base, outcome: "empty", responseText: "", error: null };
}

/**
 * The single entry point. Resolution order is the specification:
 *   1. a timeout wins over everything — a partial blob from a killed process is
 *      not trustworthy;
 *   2. parseable JSON with a string `status` → the JSON path;
 *   3. otherwise → the legacy text + log path.
 *
 * `downgraded` (set by `runForeground` when a flag-rejection retry actually
 * happened) forces step 3 even when stdout happens to parse as JSON: after a
 * confirmed downgrade, `--output-format json` was NOT on the argv that
 * produced this stdout, so stdout is the model's own untrusted response text,
 * not agy's transport envelope. Treating a forged `{"status":"ERROR",...}`
 * blob written by that model as the envelope would let its `error`/
 * `conversation_id` fields escape the untrusted-output fence — see render.mjs.
 *
 * `stderr` / `code` / `spawnError` are one additional signal, not a verdict:
 * they can only turn a legacy "success" (any non-empty stdout) or "empty"
 * (no stdout) outcome into "failed" when the process reported an
 * UNAMBIGUOUS invocation failure (see `classifyProcessFailure`). A bare
 * nonzero exit code next to a real response is never enough on its own — agy
 * itself is not reliable there, and neither is any other binary in general.
 *
 * @param {{stdout: string, logText: string, timedOut?: boolean, printTimeout?: string,
 *           downgraded?: boolean, stderr?: string, code?: number|null, spawnError?: string}} input
 * @returns {RunResult}
 */
export function classifyRun({ stdout, logText, timedOut, printTimeout, downgraded, stderr, code, spawnError }) {
  if (timedOut) {
    return {
      outcome: "failed",
      responseText: "",
      conversationId: scanAgyLog(logText || "").conversationId,
      error: {
        kind: "timeout",
        message: `Antigravity timed out after ${printTimeout || "the print timeout"}. Try --print-timeout 20m or run with --background.`,
        resetsIn: null,
      },
      usage: null,
      durationSeconds: null,
      numTurns: null,
      source: "json",
    };
  }

  const processFailure = classifyProcessFailure({ stderr, code, spawnError });

  const json = downgraded ? null : parseAgyJson(stdout);
  if (json && typeof json.status === "string") {
    // The JSON envelope is agy's own structured report of what happened; it is
    // authoritative and is not second-guessed by exit-code/stderr noise.
    return fromJson(json);
  }

  const legacy = fromLegacy({ stdout, logText });
  if (processFailure && legacy.outcome !== "failed") {
    return { ...legacy, outcome: "failed", responseText: "", error: processFailure };
  }
  return legacy;
}
