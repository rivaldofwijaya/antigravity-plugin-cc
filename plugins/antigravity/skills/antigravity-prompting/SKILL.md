---
name: antigravity-prompting
description: "How to write effective prompts for Google Antigravity agents (used when delegating to or reviewing with the antigravity plugin)"
---

# Prompting Antigravity

You drive `agy` in print mode through the companion's `delegate`, `review`, and `resume` subcommands. Print mode is headless: one prompt in, one result out. The agent cannot stop to ask you a clarifying question, so the prompt you send is the whole brief. Write it like a work order for a fast, literal junior engineer.

This guide is the short version. The depth lives in two reference files:
- **[Recipes](references/antigravity-recipes.md)** — copy-paste templates for fixes, features, review, investigation, refactor, and tests.
- **[Anti-patterns](references/antigravity-antipatterns.md)** — the common mistakes and their fixes.

## Writing a brief that survives print mode

These are properties of the print-mode interface and of briefs that have worked here, not
measured claims about every model Antigravity serves. Write against them as defaults, and
let a run's actual result correct them.

- **Say what “done” looks like, not what to do.** "Fix the bug" leaves the agent to choose which bug and what fixed means. "`parseDate` returns `null` for empty input, with a test covering it" is checkable by you and by the agent, and it is the single change that most often turns a wasted run into a usable one.
- **Ask for the output you want.** One prompt in, one result out: nothing downstream can prompt for the plan, the rationale, or the summary of the change, so request it in the brief or do without it.
- **Give the goal and the constraints; leave the route open.** Over-scripting each step spends the brief on decisions the agent can make from the repository.
- **Material first, instruction last, restrictions at the end.** Put the code, diff, or data first and anchor the ask to it ("Based on the diff above, …"). Put "do NOT change X" in the closing lines — a negative constraint buried early in a long prompt is the one most often lost.
- **One markup style throughout.** Markdown headings or plain labels are enough. Mixing XML tags and Markdown blurs the line between instruction and data.

If a run misses the target, re-read the brief for the acceptance criterion you left out before you re-run it.

Pick the model through the companion, not in the natural-language prompt. Use `--model <id>` for a per-run selection and `--effort low|medium|high` for reasoning effort. With no `--model`, `agy` uses the user's default selected with `/model` in the TUI. The companion deliberately lets `agy` validate model IDs so its error can enumerate the currently available choices.

## A solid delegate prompt has five parts

1. **Goal** — one sentence, the outcome you want.
2. **Acceptance criteria** — how *you* will know it's done (tests pass, endpoint returns X, build is green). This is what turns a vague request into a checkable one.
3. **Where to look** — the files, dirs, or modules that matter. Saves the agent a blind search and keeps it on target.
4. **Scope boundaries** — what NOT to touch (other modules, public API shape, formatting of unrelated files). Put these last.
5. **Output expectation** — code change only, or also a short summary of what changed and why.

Keep it tight. A focused 8-line brief beats a 40-line essay; over-stuffed context buries the actual ask.

## Containment and write capability

`delegate` is **write-capable by default** — it can edit files and run commands. Choose deliberately:

| Flag | `--sandbox` | `--mode plan` | No-write preamble | Use for |
| --- | --- | --- | --- | --- |
| *(default)* | no | no | no | Apply the change; review the diff after. |
| `--sandbox` | yes | no | no | Let it try things, contained from the real tree. |
| `--read-only` | yes | no | yes | Investigation and explanation. |
| `--plan` | yes | yes | no | "Tell me how you'd do it" — `agy`'s own planning mode. |
| `review` | yes | no | yes | Always. Not overridable. |

None of these is a hard write barrier. The companion passes
`--dangerously-skip-permissions` by default because `agy` cannot act in print
mode without it; `--no-yolo` is the user's explicit opt-out and suppresses that
flag. The sandbox, plan mode, and no-write preamble are defence in depth, not a hard
barrier. So before every delegation, not only a write-capable one, record the starting
state — `git status --porcelain` and the current commit — so that afterwards you can tell
what Antigravity did from what was already in the tree. A `--sandbox`, `--read-only`, or
`--plan` run needs the same baseline: containment narrows what it can touch, so the
baseline is what lets you say nothing was applied instead of assuming it. Preserve the pre-existing staged and unstaged diffs
(`git diff --cached --binary` and `git diff --binary`) and a content snapshot of
relevant untracked files, including new files inside untracked directories. Status
and commit alone cannot distinguish later edits within an already dirty file.
Keep the baseline outside the delegated workspace. After the run, compare against that record before claiming the
real tree was untouched or crediting any change to Antigravity.

If you're unsure whether a task should write, start with `--plan` for a plan or
`--read-only` for investigation, then re-run write-capable (or `resume` the
conversation) to apply it.

## Limits to be honest about

- **Print mode won't ask you questions.** Ambiguity becomes a guess. Front-load the detail.
- **Preview quota.** Quota exhaustion is a classified error; the companion reports it as `RESOURCE_EXHAUSTED (429) ... Resets in <dur>`. Report that error and wait for the reset — re-prompting won't help. An `empty` result instead means the run completed with no output and no error: do not relabel it as quota exhaustion; say that no output was produced, then use `/antigravity:resume` or inspect the reported log path.
- **Auth is the user's job.** OAuth via Google account, no API key. The plugin never logs anyone in.
