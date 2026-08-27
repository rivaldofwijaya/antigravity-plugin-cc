---
description: Check whether the Antigravity CLI (agy) is installed and signed in, and show you how to install it if it's missing.
argument-hint: '[--json]'
allowed-tools: Bash(node:*)
---

Detect the state of the Antigravity CLI. Run exactly this:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/antigravity.mjs" setup --json $ARGUMENTS
```

Read the JSON: `{ ready, installed, binaryPath, version, authedGuess, configDir }`.

**If `installed` is `false`** — the `agy` binary wasn't found.

**Do not install it yourself.** You have no `curl` or `bash` grant here, and that is deliberate: installing `agy` means executing a script fetched from a URL at the moment you run it, and that is the user's decision to make deliberately, not something to slip past them behind a single yes/no prompt.

Instead, show them the official installer command and let them run it:

> **macOS / Linux**
> ```
> curl -fsSL https://antigravity.google/cli/install.sh | bash
> ```
> **Windows (PowerShell)**
> ```
> irm https://antigravity.google/cli/install.ps1 | iex
> ```
>
> In Claude Code you can run it inline by typing `!` followed by the command.

Tell them plainly what it does: it fetches and executes a script from `antigravity.google` with your user's privileges. Google's installer does verify a SHA-512 checksum against its own manifest before installing, and it removes the macOS quarantine attribute from the binary it installs. The installed CLI then self-updates in the background, so its version will change over time without asking.

If they'd rather not pipe a URL into a shell, point them at Google's documented install instructions and let them fetch, read, and run the script as separate steps.

Once they say they've installed it, rerun the detection:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/antigravity.mjs" setup --json $ARGUMENTS
```

**If `installed` is `true`** — don't ask about installation.

**If `installed` is `true` but `authedGuess` is `false`** — `agy` is here but you're probably not signed in. Sign-in is browser OAuth with your Google account; there's no API key for the preview tier, and this command never authenticates for you. Tell the user to run `agy` once interactively to finish the browser sign-in — in Claude Code, type `! agy` and complete the Google flow, then come back and run `/antigravity:setup` again.

**Final output** — present the human-readable setup by running the same command without `--json`:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/antigravity.mjs" setup $ARGUMENTS
```

Show that output to the user. If they haven't installed `agy`, show the original detection result instead. Don't invent flags, don't claim a sign-in you didn't verify, and don't claim an install you didn't watch succeed.
