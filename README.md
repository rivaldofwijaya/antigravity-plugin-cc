# antigravity-plugin-cc

> Drive Google's Antigravity CLI (`agy`, powered by Gemini 3.5) without leaving Claude Code.

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Fork of Idun-Group/antigravity-plugin-cc](https://img.shields.io/badge/fork%20of-Idun--Group%2Fantigravity--plugin--cc-6E56CF.svg)](https://github.com/Idun-Group/antigravity-plugin-cc)
[![Powered by agy / Gemini 3.5](https://img.shields.io/badge/powered%20by-agy%20%2F%20Gemini%203.5-4285F4.svg)](https://antigravity.google/docs/cli-overview)

A Claude Code plugin that hands work to `agy`, Google's Antigravity CLI, and brings the result back into your session. Use Gemini 3.5 for a second opinion on a diff, or to run a task in parallel while you keep working. It runs on its own quota, so it doesn't draw down your Claude Code usage.

## Requirements

- **`agy`**, installed and signed in (Google account, browser OAuth, free preview tier).
- **Node.js >= 18**. The companion is a small ESM script with zero runtime dependencies.

```bash
# macOS / Linux  →  installs to ~/.local/bin/agy
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

```powershell
# Windows
irm https://antigravity.google/cli/install.ps1 | iex
```

Sign in once, interactively. In Claude Code, type `! agy`, complete the OAuth flow in the browser, then quit the TUI. The plugin never authenticates for you.

## Install

```text
/plugin marketplace add Idun-Group/antigravity-plugin-cc
/plugin install antigravity@idun-antigravity
/antigravity:setup
```

`/antigravity:setup` confirms `agy` is reachable and tells you what to fix if it isn't.

## Commands

| Command | What it does |
| --- | --- |
| `/antigravity:delegate` | Hand a task to Gemini 3.5. Write-capable by default; `--read-only` or `--sandbox` contains it, `--background` detaches it. |
| `/antigravity:review` | Cross-model review of your diff (or `base...HEAD`). Sandboxed, with a no-write instruction. Your diff is sent to Google in the prompt. |
| `/antigravity:resume` | Continue the last conversation, or a specific one via `--conversation <uuid>`. |
| `/antigravity:status` | List background jobs for this repo, or inspect one. |
| `/antigravity:result` | Print a finished job's output, its conversation id, and a resume hint. |
| `/antigravity:cancel` | Stop a running background job. |
| `/antigravity:setup` | Check the `agy` binary, version, and sign-in state. |

```text
/antigravity:review focus on error handling and edge cases
/antigravity:review --base main the auth refactor in this branch

/antigravity:delegate add a --json flag to the export command and update the tests
/antigravity:delegate --read-only explain how the retry logic in client.ts works
/antigravity:delegate --background port the utils module from CommonJS to ESM
   → returns a job id, e.g. agy-l3k9zf-a8x2qd

/antigravity:status agy-l3k9zf-a8x2qd
/antigravity:result agy-l3k9zf-a8x2qd
/antigravity:resume now add unit tests for the code you just wrote
```

Job ids look like `agy-<id>`; conversation ids are UUIDs. `status`, `result`, and `cancel` accept a job id and default to the latest job when you omit it.

## Notes

**Containment:** `agy` has no true read-only mode. `--read-only` and `--sandbox` narrow what it can touch, but they don't make writes impossible, so check `git status` when it matters.

**Choosing the model:** there is no `--model` flag on `agy`. The model (default Gemini 3.5 Flash) is chosen with `/model` *inside* `agy` and persisted in its `settings.json`. Run `! agy`, type `/model`, pick one, and that choice sticks for headless runs too.

**Empty output but no error:** on quota exhaustion `agy` exits `0` with empty stdout. The companion reads `agy`'s log and reports what actually happened: `RESOURCE_EXHAUSTED (429) … Resets in <duration>`, auth failures, and backend errors the exit code hides. The quota is per Google account and this is a preview-tier limit, not a bug. Wait for the reset, or sign `agy` into a different account.

**`agy` in a custom path:** the companion looks on `PATH`, then `~/.local/bin/agy`. Set `ANTIGRAVITY_CC_AGY_BIN` to point it elsewhere.

## Credits

Forked from [`Idun-Group/antigravity-plugin-cc`](https://github.com/Idun-Group/antigravity-plugin-cc), which was in turn inspired by [`openai/codex-plugin-cc`](https://github.com/openai/codex-plugin-cc). [Antigravity CLI docs](https://antigravity.google/docs/cli-overview).

Licensed under [MIT](./LICENSE). PRs welcome.

Independent project. Not affiliated with, endorsed by, or sponsored by Google or Anthropic. "Antigravity", "Gemini", and "Claude Code" belong to their respective owners.
