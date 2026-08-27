import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createJob, pruneJobs } from "../plugins/antigravity/scripts/lib/jobs.mjs";

function envWithHome() {
  return { ...process.env, ANTIGRAVITY_CC_HOME: mkdtempSync(join(tmpdir(), "agy-jobs-")) };
}

function seedJob(env, id, { status = "done", ageDays = 0, pid = null } = {}) {
  const dir = join(env.ANTIGRAVITY_CC_HOME, "jobs", id);
  mkdirSync(dir, { recursive: true });
  const startedAt = new Date(Date.now() - ageDays * 86_400_000).toISOString();
  writeFileSync(
    join(dir, "meta.json"),
    JSON.stringify({ id, kind: "delegate", title: id, status, pid, startedAt }, null, 2),
  );
  return dir;
}

function jobIds(env) {
  return readdirSync(join(env.ANTIGRAVITY_CC_HOME, "jobs")).sort();
}

// T-J3
test("pruneJobs deletes past the TTL and beyond the cap, but keeps running jobs", () => {
  const env = { ...envWithHome(), ANTIGRAVITY_CC_JOB_TTL_DAYS: "14", ANTIGRAVITY_CC_MAX_JOBS: "3" };

  seedJob(env, "agy-aaa-000001", { ageDays: 30 });            // too old
  seedJob(env, "agy-aaa-000002", { ageDays: 40, status: "running", pid: 999_999_999 }); // old but running
  seedJob(env, "agy-aaa-000003", { ageDays: 4 });
  seedJob(env, "agy-aaa-000004", { ageDays: 3 });
  seedJob(env, "agy-aaa-000005", { ageDays: 2 });
  seedJob(env, "agy-aaa-000006", { ageDays: 1 });             // newest

  pruneJobs(env);
  const kept = jobIds(env);

  assert.ok(!kept.includes("agy-aaa-000001"), "a 30-day-old finished job must go");
  assert.ok(kept.includes("agy-aaa-000002"), "a running job must survive its own TTL");
  assert.ok(!kept.includes("agy-aaa-000003"), "the oldest finished job past the cap of 3 must go");
  for (const id of ["agy-aaa-000004", "agy-aaa-000005", "agy-aaa-000006"]) {
    assert.ok(kept.includes(id), `${id} is within the cap and must stay`);
  }
});

// T-J4
test("pruneJobs never deletes a directory whose name is not a job id", () => {
  const env = { ...envWithHome(), ANTIGRAVITY_CC_MAX_JOBS: "0", ANTIGRAVITY_CC_JOB_TTL_DAYS: "0" };
  mkdirSync(join(env.ANTIGRAVITY_CC_HOME, "jobs"), { recursive: true });
  mkdirSync(join(env.ANTIGRAVITY_CC_HOME, "jobs", "not-a-job"), { recursive: true });
  seedJob(env, "agy-bbb-000001", { ageDays: 99 });

  pruneJobs(env);

  assert.ok(existsSync(join(env.ANTIGRAVITY_CC_HOME, "jobs", "not-a-job")), "unknown dirs are left alone");
  assert.ok(existsSync(env.ANTIGRAVITY_CC_HOME), "the store root itself must survive");
  assert.ok(!existsSync(join(env.ANTIGRAVITY_CC_HOME, "jobs", "agy-bbb-000001")));
});

test("pruneJobs prunes across repositories, not just the current cwd", () => {
  const env = { ...envWithHome(), ANTIGRAVITY_CC_MAX_JOBS: "1", ANTIGRAVITY_CC_JOB_TTL_DAYS: "365" };
  seedJob(env, "agy-ccc-000001", { ageDays: 5 });
  seedJob(env, "agy-ccc-000002", { ageDays: 1 });
  pruneJobs(env);
  assert.deepEqual(jobIds(env), ["agy-ccc-000002"]);
});

test("createJob prunes as a side effect and never throws when the store is odd", () => {
  const env = { ...envWithHome(), ANTIGRAVITY_CC_MAX_JOBS: "2", ANTIGRAVITY_CC_JOB_TTL_DAYS: "365" };
  seedJob(env, "agy-ddd-000001", { ageDays: 9 });
  seedJob(env, "agy-ddd-000002", { ageDays: 8 });
  const fresh = createJob({ kind: "delegate", title: "new", prompt: "p", cwd: "/x" }, env);
  const kept = jobIds(env);
  assert.ok(kept.includes(fresh.id), "the job just created must never be pruned");
  assert.equal(kept.length, 2);
});
