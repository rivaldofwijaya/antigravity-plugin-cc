// What the installed `agy` can do — currently just its version.
//
// Stdlib only, by constraint: no semver dependency, so the comparison lives
// here. JSON support is deliberately NOT version-gated; it is probed at runtime
// by the flag-rejection retry in agy.mjs. This floor is an advisory about
// reporting fidelity, nothing more.

/**
 * 1.1.20 fixed print mode reporting benign tool errors as fatal exit codes;
 * 1.1.18 fixed print mode exiting 0 with an empty response on a dropped agent
 * stream. Both are failure modes this plugin has to report accurately, so 1.1.20
 * is the first release where it can.
 */
export const MIN_RECOMMENDED_AGY = "1.1.20";

/**
 * Pull `major.minor.patch` out of whatever `agy --version` printed. Tolerates a
 * leading `v`, a surrounding sentence, and trailing build metadata.
 *
 * @param {string} text
 * @returns {{major:number, minor:number, patch:number}|null}
 */
export function parseVersion(text) {
  if (typeof text !== "string") return null;
  const m = text.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

/**
 * Compare two version strings numerically.
 * Returns 0 when either side is unparseable — callers that care about the
 * difference between "equal" and "unknown" must call parseVersion themselves,
 * as isVersionOk does.
 *
 * @returns {-1|0|1}
 */
export function compareVersions(a, b) {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (!va || !vb) return 0;
  for (const key of ["major", "minor", "patch"]) {
    if (va[key] < vb[key]) return -1;
    if (va[key] > vb[key]) return 1;
  }
  return 0;
}

/**
 * Is this `agy` at or above the recommended floor?
 *
 * @param {string} text raw `agy --version` output
 * @param {string} [floor]
 * @returns {true|false|null} null when the version cannot be identified — we
 *   never nag a user about a binary we cannot read.
 */
export function isVersionOk(text, floor = MIN_RECOMMENDED_AGY) {
  if (!parseVersion(text)) return null;
  return compareVersions(text, floor) >= 0;
}
