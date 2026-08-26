# AST10 Audit — antigravity-plugin-cc

## Target identity

| | |
|---|---|
| Source | `https://github.com/Idun-Group/antigravity-plugin-cc` |
| Commit audited | `be1d05faef588fc984202806ed89cc0e2f60ff0c` (2026-05-31, "fix: correct model name to Gemini 3.5 across docs + regenerate banner") |
| Path | shallow clone in a work directory outside this report's tree |
| Ecosystems detected | `claude-plugin`, `claude-skill` |
| Files audited | 37 (1 binary not analyzed, 1 directory excluded: see Scope limitations) |
| Static engine | `SkillSpector v2.9.6` — ran successfully, 100% component coverage (37/37) |
| Engine invocation | `skillspector scan <target> --format json --no-llm` |
| Audit date | 2026-08-27 |

A first pass was attempted with the LLM analyzers enabled (`google/gemini-3.7-flash`
via OpenRouter, reasoning effort high) under explicit per-run consent. It was
abandoned: OpenRouter's shared Google pool returned HTTP 429 on every batch
(4/4 failed on the retry) and SkillSpector exited 2. Per the audit contract an
incomplete scan is not normalized, so the report of record is the static run
above, which completed cleanly. The three semantic analyzers
(`semantic_developer_intent`, `semantic_quality_policy`,
`semantic_security_discovery`) therefore did not contribute; the reasoning they
would have supplied is mine, in the agent-derived findings below.

<details>
<summary>SHA-256 per file</summary>

| File | SHA-256 |
|---|---|
| `.claude-plugin/marketplace.json` | `2feba039a5d84347c81e232ffa8407cfaa7b2e743c39d7fe8dc8f7b504012d48` |
| `.github/workflows/ci.yml` | `c9490a3591a428427ae19882bb124c9d14556f2e11fc7f1332835944c53ae8f9` |
| `.gitignore` | `d719924b5ba4567439cb2c2a083239aeea4222d6a08a97ca28d785cfec878975` |
| `CONTRIBUTING.md` | `8c8f7df5ddae04ae9067e7a755018a48f38acf68a2ea439563856131a541477e` |
| `LICENSE` | `911367ddd1e53e5d2631838733584cedbc5b86c1683ed133ffc55baefc2b792a` |
| `README.md` | `73dd5093c3c22ac6f8617b866c460b1a13c4f3bf1cf7a9dc91408777a0fa6f30` |
| `assets/banner.png` | `0b401cd3b5452c60cab9b5d7b86c486e9312dd0ef995c71ce7f318db22afd209` |
| `docs/antigravity-cli-reference.md` | `9039581c9601b54eefc86b26928d60fe3acb65d589e359715233dcccb8351926` |
| `package.json` | `ae43291a7f0e54720f903d482f906b64719faccbe93138b79d748e0541fdec8b` |
| `plugins/antigravity/.claude-plugin/plugin.json` | `b64cc5ddcab737a8d6a27512f16c8bf809c55ee4721d43f7a8b6c69c77133936` |
| `plugins/antigravity/CHANGELOG.md` | `dad7bb5a8cbefb9ef323d2c536eed2476e68158721542ac50cd278f911f2f490` |
| `plugins/antigravity/agents/antigravity-pair.md` | `8a2a31e6a96de297aabda9eb4a210019eb315aeee3fc2ea71be75b20104be314` |
| `plugins/antigravity/commands/cancel.md` | `b7311741a9fc4fd1980d324e7b5f24008d119e853edbef11f103d96cc3fcce8f` |
| `plugins/antigravity/commands/delegate.md` | `7dc7a11b3f6e13a8c164ac5f7ee43bb6e5b8c50320d28ed01d89a5ac52e4304a` |
| `plugins/antigravity/commands/result.md` | `6780eeb38219213d061deb2afa1ae605f47615c00ad1e1b9a815ec5499104551` |
| `plugins/antigravity/commands/resume.md` | `c58c8a35a6d6252f25ba1775a75211462f004a5b7c2f2cc9338c6f38436015db` |
| `plugins/antigravity/commands/review.md` | `96abfbc4e5eb3a086117b330c76ab56bdb174b73c2a68c78eaf98f4b9edde457` |
| `plugins/antigravity/commands/setup.md` | `0ada2deb7a8dc0cf623e0f331aac4416fd5cc75d97df0dab8ff552058edf712a` |
| `plugins/antigravity/commands/status.md` | `bfc4634a9e29bb89362c45bcee1ebb0981a291cca172bd1d405a0429867c194e` |
| `plugins/antigravity/scripts/antigravity.mjs` | `13975da25b62fe6aa2a7ae771853cb0a52c445fce2abfe97416152c0eb1d0067` |
| `plugins/antigravity/scripts/lib/agy.mjs` | `3ab1e0749e478aa4ee9bee442639cd842d6500147a39a6edd549cd0109f5b2ab` |
| `plugins/antigravity/scripts/lib/args.mjs` | `dd2a3b5b199c45de10445e044fd9d16c3279c6fb4151ddc959b3379c155d4861` |
| `plugins/antigravity/scripts/lib/git.mjs` | `915403bfb942ef7dfe6b0ac2ddc862e1f9da7d019374669b6964cafa58bd2a58` |
| `plugins/antigravity/scripts/lib/jobs.mjs` | `51d92b30bdfdc898cf5af2202227c5b6059f0eb53878176d4d7252938f6de962` |
| `plugins/antigravity/scripts/lib/logscan.mjs` | `e744f8c2c35b49ddb445ae6cddd9f4bca94524379db97fc543d217ea07d09ea6` |
| `plugins/antigravity/scripts/lib/paths.mjs` | `40b603773a2a8aa417afd97918fdbbe16ae5d2585af616036ba5f38180c2cf74` |
| `plugins/antigravity/scripts/lib/render.mjs` | `33ac23fbf9e36a8d4eff769bca34bffa09960cab54b36348e1a79d566a9ea5e2` |
| `plugins/antigravity/skills/antigravity-cli-runtime/SKILL.md` | `d16770b4f9e443a8b989add3ac84e28494797e524d14835246adfd6a46aef1b5` |
| `plugins/antigravity/skills/antigravity-result-handling/SKILL.md` | `b629bc7afab424f6552b891c7e46cc4125c123ef535703ae56168103cf58a2a3` |
| `plugins/antigravity/skills/gemini-3-prompting/SKILL.md` | `94362c07476361da596104f1f39145139024187c9cd64a65db0887e63379c9d4` |
| `plugins/antigravity/skills/gemini-3-prompting/references/gemini-3-antipatterns.md` | `3256f9275ef096362449a7d7be59f2aefa2276bfaa5182ce093019b1f6dc650a` |
| `plugins/antigravity/skills/gemini-3-prompting/references/gemini-3-recipes.md` | `7c15cd9d3ac79c649140c905741d144089c42489b5efb48285efb0c2119038d4` |
| `tests/agy.test.mjs` | `40a6e6467987189ba1ebaff0051647cf47295dc0e1273e13506efc47795d613a` |
| `tests/args.test.mjs` | `9897907dde50a2d3ea24d17f48ca7314b916cf580ca97e4e924621ead03fbf4b` |
| `tests/fake-agy.mjs` | `8d87e7ed2c09c9d8d168d09381378560fd1278ce4d161527152272aec0d514aa` |
| `tests/integration.test.mjs` | `74323e25f59c284dcc760da82a2a546bd9d9bc85520aeb4b05941ef3974cd710` |
| `tests/logscan.test.mjs` | `4c2cd0ae3022627233a09a3bdc7febf51445adab3048fe2bc123e5d02e0f7a74` |

</details>

This audit is valid for exactly these bytes. Any later version is unreviewed.

## Verdict

**`FAIL`**

Rule applied: `A confirmed Critical finding (AST01 or AST02) is present.`

| Verdict | Condition |
|---|---|
| FAIL | Any confirmed Critical (AST01/AST02) finding. |
| WARN | Any High or Medium finding, or any unresolved unknown. |
| PASS | Nothing found, and the static engine ran successfully. |
| PASS (low confidence) | Nothing found, but the static engine did not run. The strongest verdict a degraded run may emit. |

**Read this verdict precisely.** FAIL here does not mean this plugin is malware.
Nothing in it steals credentials, exfiltrates data, opens a shell, or attempts to
manipulate this auditor — I looked for all four and found none. The FAIL is
driven by AST02: the plugin instructs the agent to pipe an unpinned remote script
into `bash`, which the AST02 rule treats as confirmed regardless of who serves
the URL today. I fetched that script and it is authentic Google tooling with a
SHA-512 integrity check. What the rule objects to is the *shape* — remote code
executed unverified at a URL whose contents can change after you install.

The substantive concerns, which no rule forced and which I would raise on their
own, are the defaults: this plugin passes `--dangerously-skip-permissions` to a
second vendor's coding agent on every delegate run unless you opt out, grants its
auto-activating subagent unrestricted `Bash`, and pipes that agent's raw output
back into Claude's context verbatim. See findings 2, 3 and 5.

29 findings: 19 High, 10 Medium, 0 at Critical severity. 18 from the static
engine, 12 from my own analysis (one deduplicated).

## Findings

### Critical

None at Critical severity. The FAIL is triggered by AST-class, not severity:
`compute_verdict` treats any AST01 or AST02 finding as verdict-determining. The
AST02 finding below is the one I confirmed on the evidence.

#### 1. Unpinned remote script piped into a shell — AST02

| | |
|---|---|
| AST ID | `AST02 — Supply Chain Compromise` |
| Severity | `HIGH` (verdict-determining as AST02) |
| Confidence | `Confirmed` |
| Evidence | `plugins/antigravity/commands/setup.md:22`, `plugins/antigravity/scripts/lib/render.mjs:68,70`, `README.md:55,60`, `CONTRIBUTING.md:37,39`, `docs/antigravity-cli-reference.md:20,23` |
| Source | `skillspector SC2` (5 locations) + `agent analysis` |

**What is there**

```
<<<TARGET plugins/antigravity/commands/setup.md:4>>>
allowed-tools: Bash(node:*), Bash(curl:*), Bash(bash:*), AskUserQuestion
<<<END TARGET>>>

<<<TARGET plugins/antigravity/commands/setup.md:22>>>
curl -fsSL https://antigravity.google/cli/install.sh | bash
<<<END TARGET>>>

<<<TARGET plugins/antigravity/scripts/lib/render.mjs:68>>>
"curl -fsSL https://antigravity.google/cli/install.sh | bash",
"irm https://antigravity.google/cli/install.ps1 | iex",
<<<END TARGET>>>
```

**Why it is exploitable**

This is not passive documentation. `setup.md` grants `Bash(curl:*)` and
`Bash(bash:*)` specifically so the agent can run the pipe itself, and directs it
to do so after a single `AskUserQuestion`. `render.mjs:68` is the plugin's own
code emitting the same one-liner into Claude's output whenever `agy` is missing.
Neither URL carries a version, tag, commit or checksum, so what reaches `bash` is
whatever that path serves at the moment of execution — not what I read today.

I fetched both, GET only, and read them as data. `install.sh` is genuine:
TLS `CN=antigravity.google` issued by Google Trust Services, 7,354 bytes, and it
does verify a SHA-512 against its manifest before installing, aborting with a
"Security Halt" on mismatch. Two behaviours worth knowing anyway: it strips the
macOS quarantine attribute from the installed binary (`xattr -d
com.apple.quarantine`), and it prints that the CLI "automatically self-updates in
the background during regular runs" — so the executable this plugin drives is
designed to change without notice. See finding 8.

**Remediation**

Pin the installer to a released version and verify a published checksum before
executing it, or remove the in-agent install path entirely and have the user
install `agy` out of band. If the in-agent path stays, drop `Bash(curl:*)` and
`Bash(bash:*)` from `setup.md` and print the command for the user to run
themselves.

### High

#### 2. `--dangerously-skip-permissions` passed by default — AST03

| | |
|---|---|
| AST ID | `AST03 — Over-Privileged Skills` |
| Severity | `HIGH` |
| Confidence | `Confirmed` |
| Evidence | `plugins/antigravity/scripts/antigravity.mjs:139`, `plugins/antigravity/scripts/lib/agy.mjs:26` |
| Source | `agent analysis` (engine flagged the documentation of this flag at `docs/antigravity-cli-reference.md:51` as `EA2`, but not the code) |

**What is there**

```
<<<TARGET plugins/antigravity/scripts/antigravity.mjs:139>>>
const yolo = !hasFlag(parsed, "no-yolo"); // write-capable by default; contained if sandbox
<<<END TARGET>>>

<<<TARGET plugins/antigravity/scripts/lib/agy.mjs:26>>>
if (opts.yolo) args.push("--dangerously-skip-permissions");
<<<END TARGET>>>

<<<TARGET plugins/antigravity/agents/antigravity-pair.md:29>>>
Default to a write-capable Antigravity run. Do not add `--read-only` or `--sandbox` unless the user explicitly asks for review, diagnosis, or research only, or asks to contain the run.
<<<END TARGET>>>
```

**Why it is exploitable**

Every `delegate` and `resume` run passes `--dangerously-skip-permissions` to
`agy` unless the caller explicitly opts out. The target's own documentation
describes what that flag does: "Auto-approve all tool permission requests without
prompting (YOLO)." Gemini therefore edits files and runs commands in the user's
repository with no per-action prompt from either agent — Claude Code's permission
system does not see those actions, because they happen inside a separate process
under a separate model. The subagent definition then instructs the model *not* to
add containment flags unless asked. An opt-out default means the unguarded path
is the one taken whenever nobody is thinking about it.

To the author's credit this is documented honestly and repeatedly — README,
both skills, and the delegate command all say "write-capable by default." Being
disclosed does not make it least-privilege.

**Remediation**

Invert the default: require an explicit `--write` / `--yolo` flag before passing
`--dangerously-skip-permissions`, and make `--sandbox` the default for `delegate`
as it already is for `review`.

#### 3. Unrestricted `Bash` grant on the auto-activating subagent — AST03

| | |
|---|---|
| AST ID | `AST03 — Over-Privileged Skills` |
| Severity | `HIGH` |
| Confidence | `Confirmed` |
| Evidence | `plugins/antigravity/agents/antigravity-pair.md:5` |
| Source | `agent analysis` |

**What is there**

```
<<<TARGET plugins/antigravity/agents/antigravity-pair.md:5>>>
tools: Bash
<<<END TARGET>>>
```

**Why it is exploitable**

Every slash command in this plugin scopes its grant properly —
`allowed-tools: Bash(node:*)` in `review.md`, `resume.md`, `result.md`,
`status.md`, `cancel.md`. The subagent, which is the component that actually acts
on the user's behalf and which is marked for proactive auto-activation, takes a
bare unscoped `Bash` instead. Its own contract says it makes exactly one call:
`node "${CLAUDE_PLUGIN_ROOT}/scripts/antigravity.mjs" delegate ...`. The grant is
enforced by the harness; the one-call rule is only prose in a prompt, and prose
is not a permission boundary.

**Remediation**

Change to `tools: Bash(node:*)`, matching the commands. The stated contract needs
nothing wider.

#### 4. Unpinned instruction-bearing external reference — AST05

| | |
|---|---|
| AST ID | `AST05 — Untrusted External Instructions` |
| Severity | `HIGH` |
| Confidence | `Confirmed` |
| Evidence | `plugins/antigravity/commands/setup.md:22` (and the six other locations in finding 1) |
| Source | `agent analysis` — no engine coverage for this category |

**What is there**

All 32 external references in this repository are unpinned. Two of them are not
merely cited but executed: `https://antigravity.google/cli/install.sh` and
`https://antigravity.google/cli/install.ps1`.

**Why it is exploitable**

The finding is mutability, not present content. The bytes I fetched and read
today are legitimate; nothing about them binds what the same URL serves after the
user installs this plugin. Anyone who can serve that path — through a compromise
at Google, a DNS or CDN takeover, or a change of policy — reaches a shell on
every machine that later runs `/antigravity:setup`. Inspecting today's response
cannot detect that, which is exactly why the rule keys on the pin and not on the
content.

**Remediation**

Pin to a released version and verify a published checksum, or vendor the
installation instructions as text the user executes deliberately.

#### 5. External model output relayed into agent context ungated — AST06

| | |
|---|---|
| AST ID | `AST06 — Weak Isolation` |
| Severity | `HIGH` |
| Confidence | `Confirmed` |
| Evidence | `plugins/antigravity/agents/antigravity-pair.md:36`, `plugins/antigravity/commands/delegate.md:24`, `resume.md:14`, `result.md:14`, `status.md:14`, `cancel.md:14`, `plugins/antigravity/scripts/lib/render.mjs:20` |
| Source | `agent analysis` |

**What is there**

```
<<<TARGET plugins/antigravity/agents/antigravity-pair.md:36>>>
Return the stdout of the `antigravity.mjs` command exactly as-is.
<<<END TARGET>>>

<<<TARGET plugins/antigravity/commands/delegate.md:24>>>
Return the subagent's stdout verbatim as your final response. No summary, no paraphrase, no reformatting — the companion's output is the answer.
<<<END TARGET>>>

<<<TARGET plugins/antigravity/commands/resume.md:14>>>
Present the companion's stdout as-is. Do not summarize, reformat, or add commentary.
<<<END TARGET>>>
```

**Why it is exploitable**

`render.mjs:20` wraps Gemini's raw response in Markdown and every command
instructs Claude to relay it without inspection. That text is produced by a
second vendor's agent which has just read the user's repository — including any
file an attacker could have planted in it. It arrives in Claude's context and in
the user's transcript with no boundary marker distinguishing it from the user's
own words. This is a standing indirect prompt-injection channel between two
agents, and the instruction "do not summarize, reformat, or add commentary" is
precisely the instruction that removes the step where Claude might otherwise
notice.

The plugin's `antigravity-result-handling` skill partly offsets this by telling
Claude to verify file edits with `git diff` rather than trusting the claimed
changes — good practice, and it does not address the injection path.

**Remediation**

Fence relayed companion stdout in an explicit untrusted-content delimiter before
it enters Claude's context, and state in `antigravity-result-handling` that
companion output is data, never instruction.

#### 6. Repository content transmitted to a third-party model — AST06

| | |
|---|---|
| AST ID | `AST06 — Weak Isolation` |
| Severity | `HIGH` |
| Confidence | `Confirmed` |
| Evidence | `plugins/antigravity/scripts/lib/git.mjs:51`, `plugins/antigravity/scripts/antigravity.mjs:143,271` |
| Source | `agent analysis` |

**What is there**

```
<<<TARGET plugins/antigravity/scripts/lib/git.mjs:51>>>
const tracked = git(["diff", "--no-color", "HEAD"], cwd).stdout;
<<<END TARGET>>>

<<<TARGET plugins/antigravity/scripts/antigravity.mjs:143>>>
const addDirs = [cwd, ...(parsed.repeated["add-dir"] || [])];
<<<END TARGET>>>
```

**Why it is exploitable**

`review` embeds the full unified diff of the working tree — with `--base`, the
entire branch range, plus untracked filenames — into a prompt sent to Google's
Antigravity backend under the user's Google account. `delegate` grants `agy` the
working directory plus any `--add-dir` path. Prompts are clamped at 100 KB but
not filtered: a `.env`, a private key or a customer record inside the diff goes
with it.

This is the plugin's stated purpose rather than a covert channel, and it is
disclosed. It is recorded here because it is a real trust-boundary crossing that
a reader must weigh before installing: private repository content leaves the
machine for a second vendor, subject to that vendor's retention and training
policies rather than Anthropic's.

**Remediation**

No code fix — this is inherent to the design. State the data flow prominently in
the README so users can decide per repository.

### Medium

#### 7. Executed binary resolved by first PATH match — AST06

| | |
|---|---|
| AST ID | `AST06 — Weak Isolation` |
| Severity | `MEDIUM` |
| Confidence | `Likely` |
| Evidence | `plugins/antigravity/scripts/lib/paths.mjs:29-42` |
| Source | `agent analysis` |

**What is there**

```
<<<TARGET plugins/antigravity/scripts/lib/paths.mjs:30>>>
const override = env.ANTIGRAVITY_CC_AGY_BIN;
if (override && isExecutableFile(override)) { return { path: override, source: "env (ANTIGRAVITY_CC_AGY_BIN)" }; }
<<<END TARGET>>>
```

**Why it is exploitable**

The companion executes the first file named `agy` found while walking `PATH` in
order, with no signature, publisher or install-location check, and an environment
variable overrides even that. Any directory earlier on `PATH` that an attacker
can write to gets an arbitrary binary executed with the plugin's arguments —
which include the user's prompt and the repository path. This is a common pattern
in CLI wrappers and the risk is real but conditional on an already-compromised
`PATH` or environment.

**Remediation**

Prefer the well-known install location over an arbitrary `PATH` hit, or verify
the resolved binary's `--version` banner and location before spawning it.

#### 8. Unpinned toolchain driving a self-updating binary — AST07

| | |
|---|---|
| AST ID | `AST07 — Update Drift` |
| Severity | `MEDIUM` |
| Confidence | `Confirmed` |
| Evidence | `docs/antigravity-cli-reference.md:20`; fetched `install.sh:59` |
| Source | `agent analysis` |

**Why it is exploitable**

Nothing in the chain is pinned. Not one of the 32 external references carries a
version, tag, commit or digest. Beyond that, the installer states that the
installed CLI "automatically self-updates in the background during regular runs,"
so the binary this plugin drives is expected to change underneath the user with
no version gate and no notification. The plugin pins neither the installer, nor
the CLI version, nor the model reached. Its own documentation is explicitly
written against `agy 1.0.3` and warns that a future release changing a flag
requires updating the doc and `agy.mjs` together — an accurate description of a
contract that can silently break.

**Remediation**

Record a known-good `agy` version at setup and warn when the resolved binary's
version differs from the contract version the plugin was verified against.

#### 9. Proactive auto-activation on a write-capable delegator — AST04

| | |
|---|---|
| AST ID | `AST04 — Insecure Metadata` |
| Severity | `MEDIUM` |
| Confidence | `Likely` |
| Evidence | `plugins/antigravity/agents/antigravity-pair.md:3,17` |
| Source | `agent analysis` |

**What is there**

```
<<<TARGET plugins/antigravity/agents/antigravity-pair.md:17>>>
Do not wait for the user to explicitly ask for Antigravity. Use this subagent proactively when the main Claude thread should hand a substantial build, debug, or refactor task to Antigravity (Gemini 3.5) for a second-model pass.
<<<END TARGET>>>
```

**Why it is exploitable**

The subagent is designed to fire without the user asking. Combined with findings
2 and 3, an unprompted routing decision can hand a user's task to a second
vendor's model with auto-approved write access to their repository. The
description does try to bound this ("Do not grab simple asks"), but "substantial"
is a judgment made by the model, not a constraint.

**Remediation**

Narrow the description to explicit user intent, or keep the proactive trigger and
force `--read-only` on any run the user did not explicitly request.

#### 10. No security scanning in CI — AST08

| | |
|---|---|
| AST ID | `AST08 — Poor Scanning` |
| Severity | `MEDIUM` |
| Confidence | `Confirmed` |
| Evidence | `.github/workflows/ci.yml` |
| Source | `agent analysis` |

**Why it matters**

CI runs unit tests on Node 18/20/22 and validates that manifests parse and
frontmatter exists — better than most plugins of this size. There is no
dependency audit, no secret scanning, no static security analysis and no skill
scanner. Nothing in the release path would catch a malicious change introduced
later by a contributor or through a compromised maintainer account. No shipped
scanner baseline was present, so nothing is being suppressed.

**Remediation**

Add secret scanning and a skill/plugin scanner to the pull-request workflow.

#### 11. Unscannable content in scope — AST08 (unresolved)

| | |
|---|---|
| AST ID | `AST08 — Poor Scanning` |
| Severity | `MEDIUM` |
| Confidence | `Unresolved` |
| Evidence | `assets/banner.png` (1,598,137 bytes), `.git/` |
| Source | `agent analysis` |

A 1.6 MB binary image was excluded from all fifteen static pattern analyzers and
from my reading; it was hashed, not analyzed. Instructions rendered as pixels are
invisible to both the engine and to me. The `.git` directory was likewise out of
scope, so nothing in this audit speaks to the repository's history. Absence of
findings in those paths is absence of inspection.

#### 12. Incomplete governance and thin provenance — AST09

| | |
|---|---|
| AST ID | `AST09 — No Governance` |
| Severity | `MEDIUM` |
| Confidence | `Confirmed` |
| Evidence | repository root; GitHub API for `Idun-Group/antigravity-plugin-cc` |
| Source | `agent analysis` |

Present: `LICENSE` (MIT), a named author (Idun Labs, `idunplatform.com`, which
301s to `idun-group.com/engine`), a `version` field in both manifests, and a
`CHANGELOG.md`. That is more than most.

Absent: no `SECURITY.md` or stated vulnerability-reporting path, no `CODEOWNERS`,
and no signature, attestation or provenance statement tying an installed copy to
audited source. The public repository has 6 stars and a commit history confined
to a single day, 2026-05-31, with no pushes in the roughly three months since —
so there is little community review and no evidence of ongoing maintenance. An
unmaintained plugin's future versions are unreviewable, and on this record may
never be re-reviewed by anyone.

The README cites `openai/codex-plugin-cc` as design inspiration. That repository
exists under the real `openai` organization (32,411 stars, Apache-2.0), so the
provenance claim checks out; this is a rewrite of a widely-used pattern, not a
typosquat of it.

**Remediation**

Add `SECURITY.md` with a reporting address, and sign or attest releases.

#### 13. Instructions designed to be imported by a second harness — AST10

| | |
|---|---|
| AST ID | `AST10 — Cross-Platform Reuse` |
| Severity | `MEDIUM` |
| Confidence | `Likely` |
| Evidence | `docs/antigravity-cli-reference.md:102-107` |
| Source | `agent analysis` |

**What is there**

```
<<<TARGET docs/antigravity-cli-reference.md:104>>>
`agy plugin import claude` imports Claude Code plugins into Antigravity, and `agy plugin install <plugin@marketplace>` / `agy plugin link` use a Claude-Code-compatible marketplace format.
<<<END TARGET>>>
```

**Why it matters**

The inventory reports two ecosystems (`claude-plugin`, `claude-skill`), and the
target's own documentation states this marketplace format is importable into
Antigravity itself. The same instruction files can therefore be executed by a
harness with a different permission model from the one they were written and
reviewed against — notably one whose defaults this plugin already sets to
auto-approve. A review performed on the Claude Code side does not transfer to the
Antigravity side. No `AGENTS.md`, `GEMINI.md`, `CLAUDE.md` or `.cursorrules` is
shipped, so there are no divergent per-platform instruction files, which is the
worse shape of this risk and is absent here.

### Engine findings I could not confirm

Reported so nothing is silently dropped. I read each location and judged it a
pattern match on descriptive prose or on ordinary code, not a real defect. They
remain in `final-findings.json` and still count toward the mechanical verdict.

| AST | Rule | Location | Severity |
|---|---|---|---|
| `AST01` | `AS1` Agent Config Directory Access | `docs/antigravity-cli-reference.md:36` | HIGH |
| `AST01` | `E4` Context Leakage | `docs/antigravity-cli-reference.md:57` | HIGH |
| `AST01` | `P6` Direct Prompt Extraction | `plugins/antigravity/scripts/antigravity.mjs:54` | HIGH |
| `AST03` | `PE3` Credential Access | `CONTRIBUTING.md:40` | HIGH |
| `AST03` | `PE3` Credential Access | `docs/antigravity-cli-reference.md:31` | HIGH |
| `AST03` | `PE3` Credential Access | `docs/antigravity-cli-reference.md:36` | HIGH |
| `AST03` | `PE3` Credential Access | `plugins/antigravity/skills/antigravity-result-handling/SKILL.md:51` | HIGH |
| `AST01` | `P4` Behavior Manipulation | `CONTRIBUTING.md:64` | MEDIUM |
| `AST01` | `P4` Behavior Manipulation | `plugins/antigravity/skills/antigravity-cli-runtime/SKILL.md:44` | MEDIUM |

Notes on the three that most look like real hits:

- `AS1 Agent Config Directory Access` fires on documentation of `agy`'s own
  config layout. The plugin does touch `~/.gemini/antigravity-cli/`, at
  `antigravity.mjs:64-68` — but only `existsSync` on the directory and an
  `installation_id` file, plus counting `.pb` filenames, to guess whether the
  user has ever signed in. No file contents are read and nothing is sent
  anywhere. Legitimate for the stated purpose; worth knowing that it enumerates
  another agent's conversation directory.
- `P6 Direct Prompt Extraction` fires on `clampPrompt()`, a `Buffer.subarray`
  truncation helper. There is no system-prompt access anywhere in the target.
- `PE3 Credential Access` fires on prose explaining that `agy` uses keyring/OAuth
  and that there is **no** API key. The plugin never reads, stores or requests a
  credential — `antigravity-result-handling` explicitly says "don't ask for
  credentials."

The inventory's two `high-entropy credential assignment` hits at
`plugins/antigravity/scripts/lib/logscan.mjs:96` are also false: the line is a
`.map()` callback building `{ line, key }` objects from log text. No credential
exists in this repository.

One engine finding I *did* substantiate is not in the table above:
`EA2 Autonomous Decision Making` at `docs/antigravity-cli-reference.md:51`. The
engine anchored it to the documentation of `--dangerously-skip-permissions`; the
code that actually passes the flag is finding 2.

### Unmapped findings

None. All 18 engine findings mapped to an AST category; `counts.unmapped` is 0.

## AST01-AST10 coverage matrix

| ID | Risk | Status | Basis |
|---|---|---|---|
| AST01 | Malicious Skills | **Clean** (5 engine findings, all unconfirmed) | engine + agent. No exfiltration, no credential access, no reverse shell, no persistence, no hooks (0 defined), no hidden encodings, no encoded blobs, no non-English instruction text. Every non-ASCII character in the target is an em dash, arrow, or emoji. |
| AST02 | Supply Chain Compromise | **Finding** (1 confirmed, finding 1) | engine + agent. `curl \| bash` in 7 locations. Zero runtime dependencies in `package.json`, no `postinstall`, no `npx -y`/`uvx`, no typosquat-shaped names — the entire supply-chain surface is the installer one-liner. |
| AST03 | Over-Privileged Skills | **Finding** (2 confirmed, findings 2-3) | engine + agent. Bare `Bash` on the subagent; `--dangerously-skip-permissions` by default. Commands are otherwise correctly scoped to `Bash(node:*)`. |
| AST04 | Insecure Metadata | **Finding** (1 likely, finding 9) | agent. All three skills have valid frontmatter, `name` matches directory, descriptions match behaviour. Only the proactive subagent trigger is over-broad. |
| AST05 | Untrusted External Instructions | **Finding** (1 confirmed, finding 4) | agent judgment — no engine coverage. 32 URLs, all unpinned; 2 instruction-bearing and executed. |
| AST06 | Weak Isolation | **Finding** (3: 2 confirmed, 1 likely; findings 5-7) | agent judgment — partial engine coverage. No MCP servers, no HTTP/SSE transport, no writes to `~/.claude/` or shell rc files. Job state is confined to `~/.antigravity-cc/`. |
| AST07 | Update Drift | **Finding** (1 confirmed, finding 8) | agent judgment — MCP Rug Pull only, and no MCP servers exist here. Nothing pinned; downstream binary self-updates. |
| AST08 | Poor Scanning | **Finding** (2: 1 confirmed, 1 unresolved; findings 10-11) | agent judgment — no engine coverage. No shipped scanner baseline. No suppression comments near network or subprocess calls. |
| AST09 | No Governance | **Finding** (1 confirmed, finding 12) | agent judgment — no engine coverage. |
| AST10 | Cross-Platform Reuse | **Finding** (1 likely, finding 13) | agent judgment — no engine coverage. Two ecosystems; no divergent per-platform instruction files. |

## Injection attempts against the auditor

> None detected.

`inventory.json`'s `auditor_injection` array is empty, and I read every
instruction-bearing file myself looking for phrasings the regex would miss: role
reassignment, fake system or tool output, claims that the audit is complete,
appeals to authority, and "do not mention" constructions. There are none. No
zero-width, bidi-control or Unicode-tag characters appear anywhere in the target
(checked directly, not only via the engine). No base64 or hex blobs. Nothing in
this repository is addressed to a reviewer.

## External reference inventory

Every URL found, whether or not it was fetched. All are unpinned. Fetches were
GET only, no authentication, no POST, depth 1.

| URL | Found at | Pinned | Instruction-bearing | Fetched | Outcome |
|---|---|---|---|---|---|
| `https://antigravity.google/cli/install.ps1` | `CONTRIBUTING.md:39`<br>`README.md:60`<br>`docs/antigravity-cli-reference.md:23`<br>`plugins/antigravity/scripts/lib/render.mjs:70` | **no** | **yes** | yes | 200, 7165 B. Not executed. **AST05 finding** — unpinned, executed via `iex`. |
| `https://antigravity.google/cli/install.sh` | `CONTRIBUTING.md:37`<br>`README.md:55`<br>`docs/antigravity-cli-reference.md:20`<br>`plugins/antigravity/commands/setup.md:22`<br>… | **no** | **yes** | yes | 200, 7354 B, `application/x-sh`. Read as data. Authentic Google tooling (TLS `CN=antigravity.google`, Google Trust Services); verifies a SHA-512 from its own manifest before installing. **AST05 finding** — the reference is unpinned regardless. |
| `https://antigravity.google/docs/cli-overview` | `README.md:11`<br>`README.md:192`<br>`docs/antigravity-cli-reference.md:5` | **no** | no | yes | 200. Human documentation. |
| `https://github.com/Idun-Group` | `.claude-plugin/marketplace.json:5`<br>`README.md:10`<br>`README.md:190` | **no** | no | no | Not fetched — cited as a link for humans, not instruction-bearing. |
| `https://github.com/Idun-Group/antigravity-plugin-cc` | `.claude-plugin/marketplace.json:20`<br>`package.json:9`<br>`plugins/antigravity/.claude-plugin/plugin.json:9` | **no** | no | yes | 200. Org account, 6 stars, single day of commits (2026-05-31). |
| `https://github.com/Idun-Group/antigravity-plugin-cc.git` | `package.json:12` | **no** | no | no | Not fetched — cited as a link for humans, not instruction-bearing. |
| `https://github.com/Idun-Group/antigravity-plugin-cc/pulls` | `README.md:12` | **no** | no | no | Not fetched — cited as a link for humans, not instruction-bearing. |
| `https://github.com/openai/codex-plugin-cc` | `README.md:14`<br>`README.md:193` | **no** | no | yes | 200. Repo exists under the real `openai` org (32,411 stars, Apache-2.0). Cited as design inspiration; claim checks out. |
| `https://idunplatform.com` | `.claude-plugin/marketplace.json:18`<br>`CONTRIBUTING.md:90`<br>`LICENSE:3`<br>`README.md:190`<br>… | **no** | no | yes | 200 via 301 to `https://idun-group.com/engine`. Author's site. Redirect to a different domain is noted, not a finding. |
| `https://img.shields.io/badge/PRs-welcome-brightgreen.svg` | `README.md:12` | **no** | no | no | Not fetched — cited as a link for humans, not instruction-bearing. |
| `https://img.shields.io/badge/built%20by-Idun%20Labs-6E56CF.svg` | `README.md:10` | **no** | no | no | Not fetched — cited as a link for humans, not instruction-bearing. |
| `https://img.shields.io/badge/license-MIT-green.svg` | `README.md:9` | **no** | no | no | Not fetched — cited as a link for humans, not instruction-bearing. |
| `https://img.shields.io/badge/powered%20by-agy%20%2F%20Gemini%203.5-4285F4.svg` | `README.md:11` | **no** | no | no | Not fetched — cited as a link for humans, not instruction-bearing. |

## Scope limitations

This audit did **not** cover:

- **Runtime behaviour.** Nothing was executed. Not the plugin, not its tests, not
  `agy`, not the fetched installer. A component that behaves differently when run
  is out of reach of this method. In particular, everything `agy` itself does
  once launched — and everything Gemini does once it holds
  `--dangerously-skip-permissions` — is downstream of this audit's boundary.
- **The `agy` binary and the Antigravity backend.** This audit covers the plugin
  that drives them, not the closed-source CLI it spawns nor the service it calls.
- **Binary and encrypted payloads.** 1 file (`assets/banner.png`, 1.6 MB) was not
  readable as text; it was hashed but not analyzed. It is the only binary in the
  repository.
- **Image-based attacks.** The same file is the only image reference; text
  rendered inside it is invisible to this method.
- **Oversized files.** 1 file exceeded the 1 MB parse cap — `assets/banner.png`,
  the same file.
- **Skipped paths.** `.git/` (`excluded-directory`), plus the 23 VCS metadata
  paths SkillSpector reported as out of scope. No conclusion about repository
  history, prior commits, or git hooks follows from this audit. No symlinks were
  present.
- **Semantic analysis.** The engine's three LLM-backed analyzers did not run.
  The first attempt was made with explicit consent and failed on upstream rate
  limiting (HTTP 429 from OpenRouter's shared Google pool, 4/4 batches); the
  report of record used `--no-llm`, so no target content left this machine.
  Static pattern analysis (15 analyzers), YARA, artifact integrity, MCP rug-pull,
  and MCP least-privilege checks all ran to completion across 37/37 components.
  The interpretive work those analyzers would have done is present as the 12
  agent-derived findings, which is where AST05-AST10 come from in any case.

## What I would tell someone deciding whether to install this

The code is clean, readable, dependency-free and honestly documented. I found no
malice, no obfuscation, and no attempt to deceive a reviewer — and the author
discloses the write-capable default in five separate places rather than hiding
it. This is a competent plugin.

The question is not whether it is malicious but whether you want its defaults.
Installing it means: a second vendor's coding agent gets auto-approved write and
command execution in your repository whenever `delegate` runs without a
containment flag; that agent's raw output flows back into Claude's context
unfiltered; your diffs go to Google; and the subagent may route work there
without you asking. If you want that trade, three changes make it far safer —
`tools: Bash(node:*)` on the subagent, `--sandbox` as the `delegate` default, and
installing `agy` yourself instead of letting `/antigravity:setup` pipe a URL into
`bash`. The first two are one-line edits you can make locally after installing.

`/antigravity:review` on its own is the low-risk path: it is read-only and
sandboxed, and its only exposure is finding 6 — your diff reaching Google — which
is the whole point of the feature.

## What a fork could and could not fix

| Class | Findings | Ceiling |
|---|---|---|
| Fully fixable in code | 2, 3, 7, 9, 10, 11, 12 | Closed. Findings 2 and 3 are one-line edits. |
| Mitigable, residue remains | 1, 4, 5, 13 | Removing the agent from the install path closes the agentic half of 1 and 4; installing `agy` at all still means running Google's remote code. Fencing relayed output reduces 5 without eliminating it. |
| Inherent to the design | 6, 8 | Your code goes to Google; Google's binary updates itself. Neither is the plugin's to fix. |

A fully remediated fork reaches **WARN**, not PASS. PASS requires an empty
finding set, and finding 6 is permanent by design while 11 stays an unresolved
scope limitation. Any plugin that brokers your code to a third-party model lands
at WARN at best under this rubric — that is the rubric working correctly, not the
plugin failing.

### Remediation order for a fork

1. **`antigravity.mjs:138-139`** — default to `--sandbox` for `delegate`, as
   `review` already does; require an explicit `--write` for host writes. Do
   **not** simply drop `--dangerously-skip-permissions`: the target's own docs
   (`antigravity-cli-reference.md:51`) state the CLI needs it to act at all in
   print mode, so removing it makes `delegate` inert rather than safe.

   ```js
   // before
   const sandbox = hasFlag(parsed, "sandbox") || Boolean(readOnly);
   const yolo = !hasFlag(parsed, "no-yolo");

   // after — contained unless the user explicitly asks for host writes
   const sandbox = !hasFlag(parsed, "write") || hasFlag(parsed, "sandbox") || Boolean(readOnly);
   const yolo = !hasFlag(parsed, "no-yolo");   // unchanged — agy needs it to function
   ```

2. **`agents/antigravity-pair.md:5`** — `tools: Bash` → `tools: Bash(node:*)`.
3. **`agents/antigravity-pair.md:29`** — invert the instruction to match the new
   default, or it fights the code.
4. **`commands/setup.md:4`** — drop `Bash(curl:*), Bash(bash:*)`; print the
   install command for the user instead of running it.
5. **`render.mjs:58-77`** — replace the two pipe-to-shell one-liners with a
   pointer to the official docs. **This is also what clears the FAIL:**
   SkillSpector's `SC2` matches the literal string, so every occurrence in
   `README.md`, `CONTRIBUTING.md` and `docs/` must go too, or the mechanical
   verdict stays FAIL on documentation alone. That is a documentation rewrite,
   not a security fix, and should be weighed as such.
6. **`render.mjs:20`** (`renderResponse`) — fence the relayed body in an
   untrusted-content delimiter.
7. **`paths.mjs`** — prefer the well-known install location over an arbitrary
   PATH hit; verify the resolved binary's version banner. Closes 7 and adds
   drift detection for 8.
8. **`SECURITY.md`, `CODEOWNERS`, a scanner step in CI** — closes 10 and most
   of 12.

Also rename `marketplace.json`'s `name` (`idun-antigravity`) and the plugin name
so the fork does not collide with upstream in a marketplace list, and bump the
version.

### Licensing a fork

`LICENSE` is standard MIT with a trademark disclaimer appended after the license
body — that appended paragraph is why GitHub's license detector reports
`NOASSERTION` while `package.json` says MIT. Forking and redistributing is
permitted; keep the copyright line and the disclaimer, and add your own
copyright line for your changes.

One inherited cost: the plugin is written against `agy 1.0.3`, and
`CONTRIBUTING.md` requires the doc and `agy.mjs` be updated together whenever a
flag changes. Since `agy` self-updates in the background, that maintenance
burden runs on a clock the fork does not control.
