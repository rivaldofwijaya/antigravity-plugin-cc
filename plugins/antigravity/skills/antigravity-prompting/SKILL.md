---
name: antigravity-prompting
description: "How to write effective prompts for Google Antigravity agents (used when delegating to or reviewing with the antigravity plugin)"
---

# Prompting Antigravity

You drive `agy` in print mode through the companion's `delegate`, `review`, and `resume` subcommands. Print mode is headless: one prompt in, one result out. The agent cannot stop to ask you a clarifying question, so the prompt you send is the whole brief. Write it like a work order for a fast, literal junior engineer.

This guide is the short version. The depth lives in two reference files:
- **[Recipes](references/antigravity-recipes.md)** — copy-paste templates for fixes, features, review, investigation, refactor, and tests.
- **[Anti-patterns](references/antigravity-antipatterns.md)** — the common mistakes and their fixes.

## How Antigravity behaves (and how to prompt for it)

The following behavioural guidance applies across the models served by Antigravity:

- **It follows instructions literally.** If you say "fix the bug," it fixes *a* bug its own way. If you say "make `parseDate` return `null` on empty input and add a test for it," you get exactly that. Spell out the target behavior, not the vibe.
- **It is terse by default.** Antigravity gives direct answers and skips narration unless you ask for it. If you want a written plan or an explanation of the change, request it explicitly.
- **It plans and reasons over multiple steps.** It is strong at decomposing a goal into steps and executing them. Give it the *goal* and the *constraints*; let it own the *how*. Over-scripting the steps fights the model.
- **It handles long context well, but cares about order.** Put the data/code/diff first, then your instruction last. Anchor the ask to the material ("Based on the diff above, ..."). Critical constraints — especially "do NOT touch X" — go at the **end** of the prompt; Antigravity can drop a negative constraint that appears too early in a long prompt.
- **One markup style, used consistently.** Markdown headings or simple labels are enough. Don't mix XML tags and Markdown in the same prompt.

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
barrier. Before a write-capable run, record the starting state — `git status --porcelain`
and the current commit — so that afterwards you can tell what Antigravity did from what
was already in the tree. Preserve the pre-existing staged and unstaged diffs
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
