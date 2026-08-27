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
    conversationId: json.conversation_id ? String(json.conversation_id) : null,
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
 * @param {{stdout: string, logText: string, timedOut?: boolean, printTimeout?: string}} input
 * @returns {RunResult}
 */
export function classifyRun({ stdout, logText, timedOut, printTimeout }) {
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

  const json = parseAgyJson(stdout);
  if (json && typeof json.status === "string") return fromJson(json);
  return fromLegacy({ stdout, logText });
}
