import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_RECOMMENDED_AGY,
  parseVersion,
  compareVersions,
  isVersionOk,
} from "../plugins/antigravity/scripts/lib/capabilities.mjs";

// T-C1
test("parseVersion handles the shapes agy --version actually emits", () => {
  assert.deepEqual(parseVersion("1.1.21"), { major: 1, minor: 1, patch: 21 });
  assert.deepEqual(parseVersion("v1.1.21"), { major: 1, minor: 1, patch: 21 });
  assert.deepEqual(parseVersion("9.9.9-fake"), { major: 9, minor: 9, patch: 9 });
  assert.deepEqual(parseVersion("agy version 1.1.21 (darwin/arm64)"), { major: 1, minor: 1, patch: 21 });
  assert.equal(parseVersion(""), null);
  assert.equal(parseVersion("garbage"), null);
  assert.equal(parseVersion(null), null);
});

// T-C2
test("compareVersions orders releases correctly", () => {
  assert.equal(compareVersions("1.1.19", "1.1.20"), -1);
  assert.equal(compareVersions("1.1.20", "1.2.0"), -1);
  assert.equal(compareVersions("1.2.0", "2.0.0"), -1);
  assert.equal(compareVersions("1.1.20", "1.1.20"), 0);
  assert.equal(compareVersions("2.0.0", "1.9.9"), 1);
  assert.equal(compareVersions("1.1.9", "1.1.10"), -1, "numeric, not lexicographic");
});

test("the recommended floor is the release that fixed print-mode exit codes", () => {
  assert.equal(MIN_RECOMMENDED_AGY, "1.1.20");
});

test("isVersionOk is true at or above the floor, false below, null when unknown", () => {
  assert.equal(isVersionOk("1.1.20"), true);
  assert.equal(isVersionOk("1.1.21"), true);
  assert.equal(isVersionOk("9.9.9-fake"), true);
  assert.equal(isVersionOk("1.0.3"), false);
  assert.equal(isVersionOk("1.1.19"), false);
  assert.equal(isVersionOk("garbage"), null, "never nag about a binary we cannot identify");
  assert.equal(isVersionOk(null), null);
});
