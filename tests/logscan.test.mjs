import { test } from "node:test";
import assert from "node:assert/strict";
import { scanAgyLog, stripGlogPrefix } from "../plugins/antigravity/scripts/lib/logscan.mjs";

const QUOTA_LOG = `I0531 16:30:42 1 server.go:755] Created conversation d112284b-3fbb-40bc-b559-5770aa771494
I0531 16:30:42 1 printmode.go:130] Print mode: conversation=d112284b-3fbb-40bc-b559-5770aa771494, sending message
E0531 16:30:43.195032 38848 log.go:398] agent executor error: RESOURCE_EXHAUSTED (code 429): Individual quota reached. Contact your administrator to enable overages. Resets in 152h59m39s.
E0531 16:30:43.196093 38848 log.go:398] RESOURCE_EXHAUSTED (code 429): Individual quota reached. Contact your administrator to enable overages. Resets in 152h59m39s.`;

test("extracts conversation id from 'Created conversation'", () => {
  const r = scanAgyLog(QUOTA_LOG);
  assert.equal(r.conversationId, "d112284b-3fbb-40bc-b559-5770aa771494");
});

test("falls back to conversation= form", () => {
  const r = scanAgyLog("blah conversation=11112222-3333-4444-5555-666677778888 more");
  assert.equal(r.conversationId, "11112222-3333-4444-5555-666677778888");
});

test("classifies quota exhaustion and parses reset window", () => {
  const r = scanAgyLog(QUOTA_LOG);
  assert.equal(r.error.kind, "quota");
  assert.equal(r.error.resetsIn, "152h59m39s");
});

test("deduplicates the repeated quota error line", () => {
  const r = scanAgyLog(QUOTA_LOG);
  assert.equal(r.errorLines.length, 1);
});

test("classifies auth errors", () => {
  const r = scanAgyLog("E0101 00:00:00 1 log.go:1] UNAUTHENTICATED (code 401): login required");
  assert.equal(r.error.kind, "auth");
});

test("classifies generic backend errors and strips glog prefix", () => {
  const r = scanAgyLog("E0101 00:00:00.0 5 log.go:9] agent executor error: INTERNAL (code 500): boom");
  assert.equal(r.error.kind, "backend");
  assert.match(r.error.message, /agent executor error/);
  assert.doesNotMatch(r.error.message, /log\.go/);
});

test("returns null error on clean log", () => {
  const r = scanAgyLog("I0101 00:00:00 1 server.go:1] all good\nCreated conversation aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
  assert.equal(r.error, null);
  assert.equal(r.conversationId, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
});

test("stripGlogPrefix is a no-op on plain text", () => {
  assert.equal(stripGlogPrefix("just a message"), "just a message");
});

import { unwrapLogLine, classifyErrorText } from "../plugins/antigravity/scripts/lib/logscan.mjs";

// Verified against agy 1.1.21 on 2026-08-27: the whole glog line is itself
// prefixed by Go's pre-initialisation logger.
const WRAPPED_AUTH_LOG = `ERROR: logging before google.Init: E0827 03:04:06.823240      80 errorreport.go:223] error getting token source: You are not logged into Antigravity.
ERROR: logging before google.Init: E0827 03:04:06.823901      80 errorreport.go:223] You are not logged into Antigravity.`;

const WRAPPED_QUOTA_LOG = `I0827 03:04:05 1 server.go:755] Created conversation d112284b-3fbb-40bc-b559-5770aa771494
ERROR: logging before google.Init: E0827 03:04:06.823240      80 errorreport.go:223] agent executor error: RESOURCE_EXHAUSTED (code 429): Individual quota reached. Contact your administrator to enable overages. Resets in 152h59m39s.
ERROR: logging before google.Init: E0827 03:04:06.824000      80 errorreport.go:223] RESOURCE_EXHAUSTED (code 429): Individual quota reached. Contact your administrator to enable overages. Resets in 152h59m39s.`;

// T-L1
test("unwrapLogLine strips the 1.1 wrapper and the glog stamp", () => {
  assert.equal(
    unwrapLogLine("ERROR: logging before google.Init: E0827 03:04:06.823240      80 errorreport.go:223] boom"),
    "boom",
  );
  assert.equal(unwrapLogLine("E0101 00:00:00.0 5 log.go:9] boom"), "boom");
  assert.equal(unwrapLogLine("just a message"), "just a message");
});

test("unwrapLogLine tolerates a doubled wrapper without looping forever", () => {
  const doubled =
    "ERROR: logging before google.Init: ERROR: logging before google.Init: E0827 03:04:06.823240      80 errorreport.go:223] boom";
  assert.equal(unwrapLogLine(doubled), "boom");
});

// T-L2 — the B1 regression test.
test("classifies auth from a real agy 1.1.21 signed-out log", () => {
  const r = scanAgyLog(WRAPPED_AUTH_LOG);
  assert.equal(r.error?.kind, "auth", "a signed-out 1.1 run must not classify as no-error");
  assert.match(r.error.message, /not authenticated/i);
});

// T-L3 — the B2 regression test.
test("classifies quota from a wrapper-prefixed line with no wrapper noise in the message", () => {
  const r = scanAgyLog(WRAPPED_QUOTA_LOG);
  assert.equal(r.error.kind, "quota");
  assert.equal(r.error.resetsIn, "152h59m39s");
  assert.equal(r.conversationId, "d112284b-3fbb-40bc-b559-5770aa771494");
  for (const line of r.errorLines) {
    assert.doesNotMatch(line, /logging before google\.Init/, "the wrapper must be gone from kept lines");
  }
  assert.equal(r.errorLines.length, 1, "the wrapped/bare pair must still collapse to one line");
});

test("classifyErrorText classifies a bare JSON error string", () => {
  const quota = classifyErrorText(
    "RESOURCE_EXHAUSTED (code 429): Individual quota reached. Resets in 152h59m39s.",
  );
  assert.equal(quota.kind, "quota");
  assert.equal(quota.resetsIn, "152h59m39s");

  const auth = classifyErrorText("error getting token source: You are not logged into Antigravity.");
  assert.equal(auth.kind, "auth");

  const backend = classifyErrorText("invalid model selection: no-such-model");
  assert.equal(backend.kind, "backend");
  assert.match(backend.message, /invalid model selection/);

  assert.equal(classifyErrorText(""), null);
  assert.equal(classifyErrorText(null), null);
});
