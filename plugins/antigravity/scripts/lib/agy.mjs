// Build and run `agy` print-mode invocations.
//
// Flag ordering matters: we place ALL flags first and `-p <prompt>` LAST. This is
// robust whether agy treats `-p/--print` as a boolean mode flag (prompt is then a
// trailing positional) or as a string flag (prompt is its value). Either way,
// `... <flags> -p "<prompt>"` is parsed correctly.

import { spawn, spawnSync } from "node:child_process";
import { openSync, readFileSync, existsSync } from "node:fs";

/**
 * Prepended to the prompt on any contained run (`--read-only`, and every
 * `review`).
 *
 * `agy` has no read-only mode of its own: `--sandbox` is an OS sandbox
 * (nsjail / sandbox-exec / AppContainer), not a write barrier, and
 * `--dangerously-skip-permissions` has to stay on or print mode cannot act at
 * all. So containment is defence in depth — the OS sandbox plus this
 * instruction. Neither alone is a guarantee; say so rather than implying one.
 */
export const READ_ONLY_PREAMBLE = [
  "READ-ONLY RUN. You are operating in inspect-only mode.",
  "Do not create, modify, move, or delete any file. Do not run any command that",
  "changes state on this machine or anywhere else. Report what you find and what",
  "you would change, as text. If the task below asks you to make changes, describe",
  "the change you would make instead of making it.",
  "",
  "--- task ---",
].join("\n");

/**
 * @param {object} opts
 * @param {string} opts.prompt
 * @param {string[]} [opts.addDirs]
 * @param {boolean} [opts.yolo]            --dangerously-skip-permissions
 * @param {boolean} [opts.sandbox]         --sandbox
 * @param {boolean} [opts.continueLast]    --continue
 * @param {string}  [opts.conversationId]  --conversation <id>
 * @param {string}  [opts.logFile]         --log-file <path>
 * @param {string}  [opts.printTimeout]    --print-timeout <go-dur>, e.g. "10m"
 * @param {boolean} [opts.jsonOutput=true] --output-format json
 * @param {boolean} [opts.disableSlashCommands=true] --disable-slash-commands
 * @param {string}  [opts.model]           --model <id>; never defaulted
 * @param {string}  [opts.effort]          --effort low|medium|high
 * @param {string}  [opts.mode]            --mode accept-edits|plan
 * @returns {string[]}
 */
export function buildPrintArgs(opts) {
  const args = [];
  if (opts.sandbox) args.push("--sandbox");
  if (opts.yolo) args.push("--dangerously-skip-permissions");
  for (const dir of opts.addDirs || []) {
    if (dir) args.push("--add-dir", dir);
  }
  if (opts.continueLast) args.push("--continue");
  if (opts.conversationId) args.push("--conversation", opts.conversationId);
  if (opts.logFile) args.push("--log-file", opts.logFile);
  if (opts.printTimeout) args.push("--print-timeout", opts.printTimeout);
  if (opts.jsonOutput !== false) args.push("--output-format", "json");
  // Every print run. `review` embeds an arbitrary git diff and `delegate`
  // embeds arbitrary user text; a diff line starting with `/` is trivially
  // plantable and would otherwise be eligible for slash-command or skill
  // expansion inside a write-capable agent. There is no opt-out for callers:
  // the companion never needs agy-side slash commands.
  if (opts.disableSlashCommands !== false) args.push("--disable-slash-commands");
  // Never defaulted: an unset model means the user's own agy default.
  if (opts.model) args.push("--model", opts.model);
  if (opts.effort) args.push("--effort", opts.effort);
  if (opts.mode) args.push("--mode", opts.mode);
  args.push("-p", opts.prompt);
  return args;
}

/**
 * Remove the flags a pre-1.1 `agy` does not know about. `--model`, `--effort`
 * and `--mode` are deliberately NOT stripped: those are explicit user requests,
 * and an old binary rejecting them must surface as an error the user sees, not
 * as a silent downgrade to a different model.
 */
export function stripProbeFlags(args) {
  const out = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--output-format") {
      i += 1; // skip its value
      continue;
    }
    if (args[i] === "--disable-slash-commands") continue;
    out.push(args[i]);
  }
  return out;
}

const FLAG_REJECTION_RE = /flag provided but not defined|not defined: --|unknown flag|invalid flag/i;

/** Parse a Go duration string ("5m0s", "90s", "10m") to milliseconds. Fallback 5m. */
export function goDurationToMs(value, fallbackMs = 5 * 60 * 1000) {
  if (typeof value !== "string" || !value.trim()) return fallbackMs;
  let total = 0;
  let matched = false;
  const re = /(\d+(?:\.\d+)?)(h|m|s|ms)/g;
  let m;
  while ((m = re.exec(value)) !== null) {
    matched = true;
    const n = parseFloat(m[1]);
    const unit = m[2];
    if (unit === "h") total += n * 3600000;
    else if (unit === "m") total += n * 60000;
    else if (unit === "s") total += n * 1000;
    else if (unit === "ms") total += n;
  }
  return matched ? total : fallbackMs;
}

function readLogSafe(logFile) {
  try {
    if (logFile && existsSync(logFile)) return readFileSync(logFile, "utf8");
  } catch {
    /* ignore */
  }
  return "";
}

function spawnOnce({ bin, args, cwd, watchdogMs }) {
  const res = spawnSync(bin, args, {
    cwd,
    encoding: "utf8",
    timeout: watchdogMs,
    killSignal: "SIGKILL",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const timedOut = res.error && /ETIMEDOUT/i.test(String(res.error.code || res.error.message || ""));
  return {
    stdout: res.stdout || "",
    stderr: res.stderr || "",
    code: res.status,
    signal: res.signal || null,
    timedOut: Boolean(timedOut),
    error: res.error && !timedOut ? String(res.error.message || res.error.code) : undefined,
  };
}

/**
 * Run agy print mode synchronously (foreground) with a hard watchdog timeout in
 * addition to agy's own --print-timeout.
 *
 * Retries ONCE without the 1.1-only probe flags if the binary rejects them, so
 * an older agy degrades to the text+log path instead of failing outright. The
 * retry is gated on a flag-parse stderr pattern AND empty stdout, so it cannot
 * mask a real failure. The downgrade note goes to stderr — stdout is Markdown
 * relayed verbatim to the user and must stay free of diagnostics.
 *
 * @returns {{ stdout: string, stderr: string, code: number|null, signal: string|null,
 *             timedOut: boolean, downgraded: boolean, logText: string,
 *             logFile: string|undefined, error?: string }}
 */
export function runForeground({ bin, args, cwd, logFile, watchdogMs }) {
  let res = spawnOnce({ bin, args, cwd, watchdogMs });
  let downgraded = false;

  const rejectedAFlag =
    res.code !== 0 && !res.timedOut && !res.stdout.trim() && FLAG_REJECTION_RE.test(res.stderr || "");
  const stripped = rejectedAFlag ? stripProbeFlags(args) : args;

  if (rejectedAFlag && stripped.length !== args.length) {
    process.stderr.write(
      "[antigravity-plugin-cc] note: this agy rejected --output-format/--disable-slash-commands; " +
        "retrying without them and falling back to log parsing. Update with `agy update` for full fidelity.\n",
    );
    res = spawnOnce({ bin, args: stripped, cwd, watchdogMs });
    downgraded = true;
  }

  return { ...res, downgraded, logText: readLogSafe(logFile), logFile };
}

/**
 * Spawn agy print mode detached for background execution.
 * stdout -> outputFile, stderr -> errFile, agy log -> (its own --log-file).
 *
 * @returns {{ pid: number }}
 */
export function spawnBackground({ bin, args, cwd, outputFile, errFile }) {
  const out = openSync(outputFile, "a");
  const err = openSync(errFile, "a");
  const child = spawn(bin, args, {
    cwd,
    detached: true,
    stdio: ["ignore", out, err],
  });
  child.unref();
  return { pid: child.pid };
}

/** Quick `agy --version`. Returns version string or null. */
export function agyVersion(bin) {
  try {
    const res = spawnSync(bin, ["--version"], { encoding: "utf8", timeout: 15000 });
    if (res.status === 0) return (res.stdout || res.stderr || "").trim().split(/\r?\n/)[0] || null;
  } catch {
    /* ignore */
  }
  return null;
}

export { readLogSafe };
