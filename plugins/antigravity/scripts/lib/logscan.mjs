// Scan an `agy` --log-file to recover what print mode hides on stdout.
//
// Grounded in real runtime behavior, verified against agy 1.1.21 on 2026-08-27:
// print mode exits 0 with EMPTY stdout when the backend call fails (e.g. quota
// exhausted). The conversation ID and the real error are only in the log.

/**
 * @param {string} logText raw contents of the agy log file (may be "")
 * @returns {{
 *   conversationId: string|null,
 *   error: { kind: "quota"|"auth"|"backend"|"timeout", message: string, resetsIn: string|null } | null,
 *   errorLines: string[]
 * }}
 */
export function scanAgyLog(logText) {
  const text = typeof logText === "string" ? logText : "";

  const conversationId = extractConversationId(text);
  const errorLines = extractErrorLines(text);
  const error = classifyError(errorLines);

  return { conversationId, error, errorLines };
}

function extractConversationId(text) {
  // Prefer the explicit "Created conversation <uuid>" then "conversation=<uuid>".
  const created = text.match(/Created conversation ([0-9a-fA-F-]{8,})/);
  if (created) return created[1];
  const eq = text.match(/conversation=([0-9a-fA-F-]{8,})/);
  if (eq) return eq[1];
  return null;
}

// agy 1.1 emits every log line through Go's pre-initialisation logger, which
// prepends its own prefix AHEAD of the glog stamp. Verified on 1.1.21.
const WRAPPER_RE = /^ERROR:\s+logging before google\.Init:\s*/;
const GLOG_RE = /^[EFIW]\d{4}\s[\d:.]+\s+\d+\s+\S+\]\s*/;

/** Strip the 1.1 pre-init wrapper only, leaving the glog stamp intact. */
function stripWrapper(line) {
  let s = String(line).trim();
  // Repeatably, but bounded — a malformed log must never spin.
  for (let i = 0; i < 4 && WRAPPER_RE.test(s); i += 1) {
    s = s.replace(WRAPPER_RE, "").trim();
  }
  return s;
}

/**
 * Reduce a log line to its message: strip the agy 1.1 wrapper, then the glog
 * stamp. A no-op on plain text.
 */
export function unwrapLogLine(line) {
  return stripWrapper(line).replace(GLOG_RE, "").trim();
}

const ERROR_KEYWORDS =
  /RESOURCE_EXHAUSTED|UNAUTHENTICATED|PERMISSION_DENIED|agent executor error|code 4\d{2}|code 5\d{2}|quota|not authenticated|login required|not logged into Antigravity|error getting token source/i;

function extractErrorLines(text) {
  const out = [];
  for (const rawLine of text.split(/\r?\n/)) {
    // Unwrap FIRST, then test — in 1.1 the severity letter is no longer at the
    // start of the raw line.
    const stamped = stripWrapper(rawLine);
    if (!stamped) continue;
    const isErrorSeverity = /^[EF]\d{4}\s/.test(stamped);
    const looksLikeError = ERROR_KEYWORDS.test(unwrapLogLine(stamped));
    if (isErrorSeverity || looksLikeError) {
      // Keep the glog stamp: dedupe() and stripGlogPrefix() still expect it.
      out.push(stamped);
    }
  }
  // De-duplicate consecutive repeats (agy logs the same error twice).
  return dedupe(out);
}

/**
 * Classify free error text — a joined set of log lines, or the `error` string
 * from `agy --output-format json`. Same logic either way, which is the point.
 *
 * @param {string} text
 * @returns {{kind:"quota"|"auth"|"backend", message:string, resetsIn:string|null}|null}
 */
export function classifyErrorText(text) {
  const joined = String(text ?? "").trim();
  if (!joined) return null;

  if (/RESOURCE_EXHAUSTED|Individual quota reached|quota/i.test(joined)) {
    const reset = joined.match(/Resets in ([0-9hms]+)/i);
    return {
      kind: "quota",
      message: "Antigravity quota exhausted (RESOURCE_EXHAUSTED 429).",
      resetsIn: reset ? reset[1] : null,
    };
  }

  if (
    /UNAUTHENTICATED|not authenticated|login required|PERMISSION_DENIED|not logged in(to)? Antigravity|error getting token source/i.test(
      joined,
    )
  ) {
    return {
      kind: "auth",
      message: "Antigravity is not authenticated. Run `! agy` once to sign in.",
      resetsIn: null,
    };
  }

  // Generic backend failure: surface the most informative line.
  const lines = joined.split(/\r?\n/).filter(Boolean);
  const informative =
    lines.find((l) => /agent executor error|code \d{3}/i.test(l)) || lines[lines.length - 1];
  return {
    kind: "backend",
    message: stripGlogPrefix(informative),
    resetsIn: null,
  };
}

function classifyError(errorLines) {
  return classifyErrorText(errorLines.join("\n"));
}

function stripGlogPrefix(line) {
  // Turn "E0531 16:30:43.195032 38848 log.go:398] message" into "message", and
  // do the same through the agy 1.1 wrapper.
  return unwrapLogLine(line);
}

function dedupe(lines) {
  // Strip prefixes, then drop any line whose message is a substring of a longer
  // kept line. agy logs the same error twice — once wrapped in
  // "agent executor error: <X>" and once as the bare "<X>" — so exact-key
  // de-duplication is not enough; we collapse to the most informative line.
  const keyed = lines.map((line) => ({ line, key: stripGlogPrefix(line) }));
  keyed.sort((a, b) => b.key.length - a.key.length);
  const kept = [];
  for (const item of keyed) {
    if (kept.some((k) => k.key === item.key || k.key.includes(item.key))) continue;
    kept.push(item);
  }
  return kept.map((k) => k.line);
}

export { stripGlogPrefix };
