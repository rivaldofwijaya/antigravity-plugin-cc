// Path + binary resolution for the Antigravity companion.
// Pure Node stdlib, no dependencies.

import { existsSync, accessSync, constants } from "node:fs";
import { homedir, platform } from "node:os";
import { join, delimiter } from "node:path";

const IS_WINDOWS = platform() === "win32";
const AGY_BIN_NAME = IS_WINDOWS ? "agy.exe" : "agy";

function isExecutableFile(path) {
  try {
    if (!existsSync(path)) return false;
    accessSync(path, IS_WINDOWS ? constants.F_OK : constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Home directory for a given environment. Env-driven so tests never touch the real one. */
function homeFor(env = process.env) {
  return env.HOME || env.USERPROFILE || homedir();
}

/**
 * Well-known install locations for `agy`, most-trusted first.
 * These are the paths the official installer writes to.
 */
function wellKnownBinaries(env = process.env) {
  const home = homeFor(env);
  return IS_WINDOWS
    ? [
        join(env.LOCALAPPDATA || join(home, "AppData", "Local"), "agy", "bin", AGY_BIN_NAME),
        join(home, ".local", "bin", AGY_BIN_NAME),
      ]
    : [join(home, ".local", "bin", AGY_BIN_NAME)];
}

/**
 * Resolve the `agy` binary. Resolution order:
 *  1. ANTIGRAVITY_CC_AGY_BIN env override (absolute path) — also used by tests.
 *  2. Well-known install locations (~/.local/bin/agy, %LOCALAPPDATA%\agy\bin).
 *  3. A directory on PATH containing `agy`.
 *
 * Well-known locations are probed BEFORE PATH deliberately. PATH is attacker-
 * influenced on a compromised machine: any writable directory earlier in it
 * would otherwise get an arbitrary binary spawned with the user's prompt and
 * repository path as arguments. The official install location is the more
 * trustworthy signal, so it wins.
 *
 * @returns {{path: string, source: string} | null}
 */
export function resolveAgyBinary(env = process.env) {
  const override = env.ANTIGRAVITY_CC_AGY_BIN;
  if (override && isExecutableFile(override)) {
    return { path: override, source: "env (ANTIGRAVITY_CC_AGY_BIN)" };
  }

  for (const candidate of wellKnownBinaries(env)) {
    if (isExecutableFile(candidate)) {
      return { path: candidate, source: "well-known location" };
    }
  }

  const pathValue = env.PATH || env.Path || "";
  for (const dir of pathValue.split(delimiter)) {
    if (!dir) continue;
    const candidate = join(dir, AGY_BIN_NAME);
    if (isExecutableFile(candidate)) {
      return { path: candidate, source: "PATH" };
    }
  }

  return null;
}

/** Root of the agy config/state directory. */
export function agyConfigDir(env = process.env) {
  return join(homeFor(env), ".gemini", "antigravity-cli");
}

/** Directory where agy persists conversation threads (`<id>.pb`). */
export function agyConversationsDir(env = process.env) {
  return join(agyConfigDir(env), "conversations");
}

/** Root for this plugin's own job state. Override with ANTIGRAVITY_CC_HOME (tests). */
export function jobsRoot(env = process.env) {
  const base = env.ANTIGRAVITY_CC_HOME || join(homeFor(env), ".antigravity-cc");
  return join(base, "jobs");
}

export function jobDir(id, env = process.env) {
  return join(jobsRoot(env), id);
}

export { IS_WINDOWS, AGY_BIN_NAME };
