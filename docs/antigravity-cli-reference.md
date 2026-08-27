# Antigravity CLI (`agy`) — grounded reference

> This contract was verified live against `agy 1.1.21` on macOS, 2026-08-27,
> by running the commands shown below. It supersedes the `agy 1.0.3` contract.
> If a future `agy` release changes a flag, update this file and
> `plugins/antigravity/scripts/lib/agy.mjs` together.

## What `agy` is

The **Antigravity CLI** (binary: **`agy`**) is the terminal surface of Google
Antigravity. It shares config, authentication, and the agent core with the
Antigravity IDE. Configuration lives under `~/.gemini/antigravity-cli/`.

## Install

```bash
# macOS / Linux
curl -fsSL https://antigravity.google/cli/install.sh | bash      # → ~/.local/bin/agy

# Windows (PowerShell)
irm https://antigravity.google/cli/install.ps1 | iex             # → %LOCALAPPDATA%\agy\bin
```

Installer flags: `-d/--dir <path>` (custom install dir). The `agy install`
subcommand configures PATH/aliases (`--skip-aliases`, `--skip-path`, `--dir`).

## Auth (important for this plugin)

- First launch performs silent keyring sign-in (Apple Keychain / Linux Secret
  Service / Windows Credential Manager). If a token is found, auth is silent.
- If not, `agy` opens a browser OAuth flow (Google account). Over SSH it prints
  a URL + code loop.
- There is no API-key environment variable for the standard preview tier — auth
  is keyring/OAuth. (`agy` does read `~/.gemini/config/mcp_config.json` for MCP.)
- Log out with `/logout` inside the TUI.

The plugin never logs you in. If you have never run `agy`, run it once
interactively (`! agy`) to authenticate, then use the plugin.

## Current command surface

Run `agy --version` to identify the installed contract. `agy --help` on the
verified binary printed the following verbatim:

```text
Usage of agy:
  --add-dir                       Add a directory to the workspace (repeatable) (default [])
  --agent                         Agent for the current CLI session
  -c                              Short alias for --continue
  --continue                      Continue the most recent conversation
  --conversation                  Resume a previous conversation by ID
  --dangerously-skip-permissions  Auto-approve all tool permission requests without prompting
  --disable-slash-commands        Disable slash command and skill expansion in print mode
  --effort                        Reasoning effort for the current CLI session (low|medium|high)
  -i                              Short alias for --prompt-interactive
  --input-format                  Input format for print mode (text, stream-json). stream-json reads one NDJSON message per line from stdin and runs a turn for each; it requires --output-format stream-json (default text)
  --json-schema                   Optional JSON schema string or path to a schema file to enforce structured output (for stream-json, only applicable to the final result)
  --log-file                      Override CLI log file path
  --mode                          Set the agent execution mode for this session (accept-edits, plan)
  --model                         Model for the current CLI session
  --new-project                   Create a new project for this session
  --output-format                 Output format for print mode (text, json, stream-json) (default text)
  -p                              Short alias for --print
  --print                         Run a single prompt non-interactively and print the response
  --print-timeout                 Timeout for print mode wait (default 5m0s)
  --project                       Project ID or project name for the current CLI session
  --prompt                        Alias for --print
  --prompt-interactive            Run an initial prompt interactively and continue the session
  --sandbox                       Run in a sandbox with terminal restrictions enabled

Available subcommands:
  agent           List available agents
  agents          List available agents
  changelog       Show changelog and release notes
  help            Show help for subcommands
  install         Configure environment paths and shell settings
  mcp             Manage MCP servers (add, remove, list, enable, disable)
  mic-serve       Serve this machine's microphone to a CLI on another host
  models          List available models
  plugin          Manage plugins (install, uninstall, list, enable, disable)
  plugins         Alias for plugin
  update          Update CLI
```

The companion uses print mode (`agy -p "<task>"`), always passes
`--dangerously-skip-permissions`, and sets `--print-timeout 10m` unless the
caller supplies another duration. It adds a 60-second process watchdog beyond
that print timeout. Interactive `-i` needs a TTY and is not used.

## Model selection

`--model <id>` selects a model for one run, and `--effort low|medium|high`
selects its reasoning effort. The companion forwards both. If `--model` is
unset, `agy` uses the user's own default, selected with `/model` in the TUI.

This model list is a snapshot recorded for `agy 1.1.21`, not a maintained
allowlist. Run `agy models` for the authoritative current list:

```text
gemini-3.7-flash-{high,medium,low}
gemini-3.6-flash-*
gemini-3.5-flash-*
gemini-3.1-pro-{high,low}
claude-sonnet-4-6
claude-opus-4-6-thinking
gpt-oss-120b-medium
```

The companion deliberately does not validate model IDs: `agy` owns the list and
its rejection output enumerates the models available to that installation.

## Structured print output

The companion's primary runtime path is reproducible with:

```bash
agy --output-format json --disable-slash-commands --dangerously-skip-permissions -p "say OK"
```

`--output-format json` returns this success shape:

```json
{"conversation_id":"a717…","status":"SUCCESS","response":"OK\n","duration_seconds":2.135746,
 "num_turns":1,"usage":{"input_tokens":14549,"output_tokens":1,"thinking_tokens":0,
 "cache_read_tokens":0,"total_tokens":14550}}
```

and this error shape:

```json
{"conversation_id":"","status":"ERROR","response":"","error":"invalid model selection …",
 "duration_seconds":0,"num_turns":0,"usage":{…}}
```

Both shapes exit with code **0**, including `status:"ERROR"`. Print mode exiting
0 therefore does not prove success; the companion classifies the JSON `status`
and `response`. It keeps the text-plus-log scan as a fallback for pre-1.1
binaries. If a foreground binary rejects the JSON and slash-command flags, the
companion retries once without those two flags and reports the downgrade on
stderr. It never retries a run that produced stdout.

There is no `model` field in this JSON. The companion renders token, turn, and
duration usage below the untrusted-output fence when `usage` is present.

## Critical runtime behavior

1. **Print mode exits 0 on failure.** The ERROR JSON above is the proof. Legacy
   quota and authentication failures may also have empty stdout, so the fallback
   scans the file named by `--log-file`.
2. **The conversation ID is in JSON and the log.** Log forms include
   `Created conversation <uuid>` and `conversation=<uuid>`; the plugin extracts
   it so `/antigravity:resume --conversation <id>` can continue the thread.
3. **Conversations persist** as
   `~/.gemini/antigravity-cli/conversations/<uuid>.db`.
4. **An empty successful response is its own outcome.** The companion reports
   `empty`, not success or failure. `/antigravity:result <job-id>` prints the log
   path and resume hint.

## Slash-command expansion is disabled

The companion passes `--disable-slash-commands` on every print run. `review`
embeds an arbitrary git diff and `delegate` embeds arbitrary user text; a diff
line beginning with `/` would otherwise be eligible for slash-command or skill
expansion inside a write-capable agent. The companion never needs that expansion
and offers no opt-out.

## Deliberately unused surface

The plugin considered but deliberately leaves out `--input-format stream-json`,
`--json-schema`, `--agent`, `--project`, `--new-project`, and `agy mcp`. They
would add structured-review, multi-turn streaming, project/agent selection, or
MCP security design beyond this companion's current scope. See spec §8,
"Out of scope, worth revisiting," and run `agy --help` or `agy mcp --help` to
inspect the current interfaces.

## Config layout

```text
~/.gemini/antigravity-cli/
  settings.json          # colorScheme, toolPermission, model defaults, trustedWorkspaces, ...
  keybindings.json
  conversations/<id>.db  # persisted threads
  log/cli-*.log          # rotating logs (cli.log symlinks to newest)
  plugins/<name>/        # staged Antigravity-CLI plugins
```

Notable `settings.json` keys include `toolPermission`,
`artifactReviewPolicy`, `enableTerminalSandbox`, `allowNonWorkspaceAccess`,
`colorScheme`, and `verbosity`.

## Cross-compatibility

`agy plugin import claude` imports Claude Code plugins into Antigravity, and
`agy plugin install <plugin@marketplace>` / `agy plugin link` use a
Claude-Code-compatible marketplace format. This plugin lives on the Claude Code
side of that interoperability: Claude Code calls `agy`.
