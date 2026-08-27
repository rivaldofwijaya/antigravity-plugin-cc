import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseAgyJson,
  fromJson,
  fromLegacy,
  classifyRun,
} from "../plugins/antigravity/scripts/lib/result.mjs";

const SUCCESS_JSON = {
  conversation_id: "a717aaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  status: "SUCCESS",
  response: "OK\n",
  duration_seconds: 2.135746,
  num_turns: 1,
  usage: {
    input_tokens: 14549,
    output_tokens: 1,
    thinking_tokens: 0,
    cache_read_tokens: 0,
    total_tokens: 14550,
  },
};

// T-R1
test("parseAgyJson returns null for plain text and never throws", () => {
  assert.equal(parseAgyJson("just a sentence"), null);
  assert.equal(parseAgyJson(""), null);
  assert.equal(parseAgyJson(undefined), null);
  assert.equal(parseAgyJson("[1,2,3]"), null, "a top-level array is not an agy result");
});

// T-R2
test("parseAgyJson recovers the object when it is preceded by log noise", () => {
  const noisy = `ERROR: logging before google.Init: starting up\nwarming caches\n${JSON.stringify(SUCCESS_JSON)}\n`;
  assert.equal(parseAgyJson(noisy).status, "SUCCESS");
});

// T-R3
test("fromJson maps SUCCESS with a response to outcome success and camelCases usage", () => {
  const r = fromJson(SUCCESS_JSON);
  assert.equal(r.outcome, "success");
  assert.equal(r.responseText, "OK");
  assert.equal(r.conversationId, "a717aaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
  assert.equal(r.error, null);
  assert.equal(r.source, "json");
  assert.deepEqual(r.usage, {
    inputTokens: 14549,
    outputTokens: 1,
    thinkingTokens: 0,
    cacheReadTokens: 0,
    totalTokens: 14550,
  });
  assert.equal(r.numTurns, 1);
  assert.equal(r.durationSeconds, 2.135746);
});

// T-R4
test("fromJson maps SUCCESS with an empty response to outcome empty, not failed", () => {
  const r = fromJson({ ...SUCCESS_JSON, response: "   \n" });
  assert.equal(r.outcome, "empty");
  assert.equal(r.error, null);
  assert.equal(r.responseText, "");
});

// T-R5
test("fromJson maps ERROR with a quota message to a failed quota result", () => {
  const r = fromJson({
    conversation_id: "",
    status: "ERROR",
    response: "",
    error:
      "RESOURCE_EXHAUSTED (code 429): Individual quota reached. Contact your administrator to enable overages. Resets in 152h59m39s.",
    duration_seconds: 0,
    num_turns: 0,
  });
  assert.equal(r.outcome, "failed");
  assert.equal(r.error.kind, "quota");
  assert.equal(r.error.resetsIn, "152h59m39s");
});

// T-R6
test("fromJson normalises an empty conversation_id to null", () => {
  const r = fromJson({ ...SUCCESS_JSON, conversation_id: "" });
  assert.equal(r.conversationId, null);
});

test("fromJson tolerates every optional field being absent", () => {
  const r = fromJson({ status: "SUCCESS", response: "hi" });
  assert.equal(r.outcome, "success");
  assert.equal(r.usage, null);
  assert.equal(r.durationSeconds, null);
  assert.equal(r.numTurns, null);
  assert.equal(r.conversationId, null);
});

test("fromJson keeps an unrecognised ERROR string as a backend failure", () => {
  const r = fromJson({ status: "ERROR", error: "invalid model selection: no-such-model" });
  assert.equal(r.outcome, "failed");
  assert.equal(r.error.kind, "backend");
  assert.match(r.error.message, /invalid model selection/);
});

// T-R7
test("classifyRun lets a timeout win over a valid SUCCESS blob on stdout", () => {
  const r = classifyRun({
    stdout: JSON.stringify(SUCCESS_JSON),
    logText: "",
    timedOut: true,
    printTimeout: "10m",
  });
  assert.equal(r.outcome, "failed");
  assert.equal(r.error.kind, "timeout");
  assert.match(r.error.message, /10m/);
});

// T-R8
test("classifyRun falls back to the log path for non-JSON stdout", () => {
  const r = classifyRun({
    stdout: "a plain text answer",
    logText: "I0101 00:00:00 1 server.go:1] Created conversation aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    timedOut: false,
  });
  assert.equal(r.source, "log");
  assert.equal(r.outcome, "success");
  assert.equal(r.responseText, "a plain text answer");
  assert.equal(r.conversationId, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
  assert.equal(r.usage, null);
});

test("fromLegacy reports no output and no error as empty, not success", () => {
  const r = fromLegacy({ stdout: "", logText: "I0101 00:00:00 1 server.go:1] all quiet" });
  assert.equal(r.outcome, "empty");
  assert.equal(r.error, null);
});

test("fromLegacy reports no output with a log error as failed", () => {
  const r = fromLegacy({
    stdout: "",
    logText:
      "ERROR: logging before google.Init: E0827 03:04:06.823240      80 errorreport.go:223] error getting token source: You are not logged into Antigravity.",
  });
  assert.equal(r.outcome, "failed");
  assert.equal(r.error.kind, "auth");
});
