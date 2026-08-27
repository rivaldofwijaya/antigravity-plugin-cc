import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPrintArgs,
  goDurationToMs,
  stripProbeFlags,
} from "../plugins/antigravity/scripts/lib/agy.mjs";

test("buildPrintArgs puts -p <prompt> LAST", () => {
  const args = buildPrintArgs({
    prompt: "do the thing",
    yolo: true,
    logFile: "/tmp/x.log",
    printTimeout: "10m",
    addDirs: ["/repo"],
  });
  assert.equal(args[args.length - 2], "-p");
  assert.equal(args[args.length - 1], "do the thing");
});

test("buildPrintArgs includes expected flags in order (flags before prompt)", () => {
  const args = buildPrintArgs({
    prompt: "p",
    sandbox: true,
    yolo: true,
    addDirs: ["/a", "/b"],
    conversationId: "conv-1",
    logFile: "/l",
    printTimeout: "5m",
  });
  assert.deepEqual(args, [
    "--sandbox",
    "--dangerously-skip-permissions",
    "--add-dir",
    "/a",
    "--add-dir",
    "/b",
    "--conversation",
    "conv-1",
    "--log-file",
    "/l",
    "--print-timeout",
    "5m",
    "--output-format",
    "json",
    "--disable-slash-commands",
    "-p",
    "p",
  ]);
});

test("continueLast adds --continue", () => {
  const args = buildPrintArgs({ prompt: "x", continueLast: true });
  assert.ok(args.includes("--continue"));
});

test("goDurationToMs parses composite and simple durations", () => {
  assert.equal(goDurationToMs("5m0s"), 300000);
  assert.equal(goDurationToMs("90s"), 90000);
  assert.equal(goDurationToMs("10m"), 600000);
  assert.equal(goDurationToMs("1h"), 3600000);
});

test("goDurationToMs falls back on garbage", () => {
  assert.equal(goDurationToMs("not-a-duration", 123), 123);
  assert.equal(goDurationToMs("", 456), 456);
});

// T-A1
test("buildPrintArgs emits the JSON + slash-command flags by default, prompt still last", () => {
  const args = buildPrintArgs({ prompt: "do it", logFile: "/l" });
  assert.ok(args.includes("--output-format"), "JSON output is the default runtime path");
  assert.equal(args[args.indexOf("--output-format") + 1], "json");
  assert.ok(args.includes("--disable-slash-commands"), "a planted diff line must not expand");
  assert.equal(args[args.length - 2], "-p");
  assert.equal(args[args.length - 1], "do it");
});

test("buildPrintArgs can opt out of the JSON and slash-command flags", () => {
  const args = buildPrintArgs({ prompt: "p", jsonOutput: false, disableSlashCommands: false });
  assert.ok(!args.includes("--output-format"));
  assert.ok(!args.includes("--disable-slash-commands"));
});

// T-A2
test("buildPrintArgs emits --model / --effort / --mode only when given", () => {
  const bare = buildPrintArgs({ prompt: "p" });
  for (const flag of ["--model", "--effort", "--mode"]) {
    assert.ok(!bare.includes(flag), `${flag} must never be defaulted`);
  }

  const full = buildPrintArgs({
    prompt: "p",
    model: "gemini-3.1-pro-high",
    effort: "high",
    mode: "plan",
  });
  assert.equal(full[full.indexOf("--model") + 1], "gemini-3.1-pro-high");
  assert.equal(full[full.indexOf("--effort") + 1], "high");
  assert.equal(full[full.indexOf("--mode") + 1], "plan");
  assert.equal(full[full.length - 2], "-p");
});

test("stripProbeFlags removes only the probe flags, keeping user intent intact", () => {
  const args = [
    "--sandbox",
    "--output-format",
    "json",
    "--disable-slash-commands",
    "--model",
    "gemini-3.1-pro-high",
    "-p",
    "p",
  ];
  assert.deepEqual(stripProbeFlags(args), ["--sandbox", "--model", "gemini-3.1-pro-high", "-p", "p"]);
});
