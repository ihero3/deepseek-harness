# DeepSeek Harness — English Promotion Kit

Launch and outreach copy in English, ready to paste, with the evidence each claim rests on.

This kit covers two tracks, and they must not be blended:

- **Part I — Deepseek Harness for Threerouter (the shipped product).** The desktop application built from this repository: DeepSeek Harness carrying the Threerouter integration plugin. This is what end users run, so it is the primary track.
- **Part II — Upstream DeepSeek Harness (developer and OSS track).** The MIT-licensed harness from DeepSeek AI itself, aimed at the audience that will read the architecture.

Evidence for Part I comes from [`plugins/dsh-plugin-threerouter`](../plugins/dsh-plugin-threerouter/package.json), [`plugins/dsh-image-video`](../plugins/dsh-image-video/package.json), and the desktop product name in [`electron-builder-config.mjs`](../apps/desktop/scripts/electron-builder-config.mjs).

Deliberately stored outside `docs/` and `packages/`: this is campaign material, not product documentation, so it stays out of the documentation gates and the bilingual pairing workflow.

## Part I — Deepseek Harness for Threerouter

### T1. What is actually being promoted

**Product name (exact):** Deepseek Harness for Threerouter. Packaged artifacts are named `dsh-threerouter-<version>-<os>-<arch>` ([electron-builder-config.mjs](../apps/desktop/scripts/electron-builder-config.mjs)).

It is the DeepSeek Harness desktop application with the Threerouter integration plugin installed in its desktop profile. The integration is what makes it a product rather than a build:

- **One login replaces API-key setup.** Signing in with a Threerouter account reuses an existing active API key or creates one, injects it into the app's credential store, registers the `threerouter` provider against the OpenAI-compatible endpoint, loads the account's model list, and selects `deepseek-v4-pro` as the default model ([threerouter-auth.ts](../plugins/dsh-plugin-threerouter/src/host/threerouter-auth.ts)). The user never copies a key.
- **The brand is Threerouter throughout.** Sidebar mark and wordmark, and the blank-session hero title "Deepseek Harness for Threerouter" ([hero-brand.tsx](../plugins/dsh-plugin-threerouter/src/client/hero-brand.tsx)).
- **A sidebar account pill carries the commercial facts:** balance, API-key readiness, quick model switch, share invite link, sign out — with the in-app value line *"Threerouter 1$ ≈ 30M token"* ([locale.ts](../plugins/dsh-plugin-threerouter/src/client/locale.ts)).
- **Text, image, and video generation live in the same composer.** A generation-mode tab switches Text / Image / Video, with Auto-or-explicit parameters: image sizes 1:1, 4:3, 3:4, 16:9, 9:16; styles Photography, Illustration, 3D Render, Anime, Ink painting; video aspect 16:9 / 9:16 / 1:1 and duration presets from 3 to 10 seconds ([composer-media-tabs.tsx](../plugins/dsh-plugin-threerouter/src/client/composer-media-tabs.tsx)).
- **Media generation runs through Threerouter's unified media API** — submit, poll, download — with results written to the workspace `outputs/` directory and rendered in the conversation ([threerouter.ts](../plugins/dsh-image-video/src/providers/threerouter.ts)). Direct Wanx and Seedance providers exist as alternates; the shipped default provider is Threerouter, and video submission is fixed to the Threerouter entry point ([runtime-defaults.ts](../plugins/dsh-image-video/src/runtime-defaults.ts)).
- **The desktop profile also installs a GitHub connector bundle** alongside the media and branding plugins.

**What the user gets, in one sentence.** An AI desktop app where one Threerouter login unlocks a coding agent plus image and video generation, with nothing to configure.

### T2. Taglines (Threerouter track)

1. **One login. Every model. Text, images, video.**
2. Sign in and start working — no API keys to copy.
3. The coding agent that generates images and video too.
4. Your whole AI stack behind one account.
5. One balance, one key, one app.

**Subhead:** *Deepseek Harness for Threerouter — an AI desktop app for coding, images, and video, powered by your Threerouter account.*

### T3. Elevator pitches (Threerouter track)

**25 words.** Deepseek Harness for Threerouter is a desktop AI app where one Threerouter login gives you a coding agent plus image and video generation — no API keys to configure.

**50 words.** Deepseek Harness for Threerouter is a desktop app built on DeepSeek Harness. Sign in with your Threerouter account and the API key, model list, and default model are configured for you. Then code with an agent, or switch the composer to Image or Video and generate media from the same window.

**100 words.** Deepseek Harness for Threerouter is a desktop application for coding and media generation. It is built on DeepSeek Harness, the open-source agent harness from DeepSeek AI, with a Threerouter integration layer. Signing in with a Threerouter account creates or reuses your API key, registers the model routes, and sets a default model — so there is no key to copy and no endpoint to configure. From the same composer you can hand a task to a coding agent that reads and edits files and runs commands, or switch to Image or Video mode to generate media with size, style, aspect, and duration controls. One account, one balance, one app.

### T4. Value propositions (Threerouter track)

1. **Zero-configuration onboarding.** Login is the entire setup: key provisioning, provider registration, model list, and default model all happen automatically.
2. **One account for text, image, and video.** No juggling separate keys for a chat model, an image model, and a video model.
3. **Media generation inside the agent workspace.** Results land in `outputs/` and appear in the conversation, so generated assets sit beside the code that used them.
4. **Price transparency.** The account pill states the rate up front: *Threerouter 1$ ≈ 30M token*.
5. **Switch models without a restart.** The sidebar pill changes the default model per session, and settings persist.
6. **Growth loop built in.** Every account can share an invite link from the sidebar.

### T5. Landing page copy (Threerouter track)

**Hero headline:** One login. Every model. Text, images, video.

**Hero subhead:** Deepseek Harness for Threerouter is a desktop AI app for coding, image generation, and video generation — all behind your Threerouter account.

**Primary CTA:** Download for Windows · **Secondary CTA:** Create a Threerouter account

**Feature block 1 — Sign in, and you are done.**
No API keys to paste, no endpoints to configure. Your key is created or reused, your models are loaded, and a default model is selected the moment you sign in.

**Feature block 2 — Code with an agent that actually works on your files.**
Give it a task and it reads and edits files, runs commands, plans multi-step work, and delegates to subagents — with approval prompts before anything risky.

**Feature block 3 — Generate images and video in the same window.**
Switch the composer to Image or Video, describe what you want, and pick a size, style, aspect ratio, or duration. Finished media is saved to your workspace `outputs/` folder and shown in the conversation.

**FAQ:**

- *Do I need an API key?* No. Sign in with your Threerouter account and the key is configured for you.
- *Which models can I use?* Every model available to your Threerouter account; the app loads the list at sign-in and defaults to `deepseek-v4-pro`.
- *Can I generate video?* Yes — video generation is part of the same composer, with 16:9, 9:16, and 1:1 output and durations up to 10 seconds.
- *What does it cost?* You pay through your Threerouter balance, at roughly 1$ ≈ 30M tokens for text, with media priced by the model you choose.
- *Is it open source?* The underlying harness, DeepSeek Harness by DeepSeek AI, is MIT licensed. This desktop build adds the Threerouter integration.

### T6. Channel copy (Threerouter track)

**X / Twitter thread:**

1. Most AI desktop apps make you hunt for an API key before you can type a word. This one asks for a login. 🧵
2. Deepseek Harness for Threerouter: a desktop app for coding, images, and video. Sign in with Threerouter and your key, models, and default model are configured automatically.
3. It is a real coding agent underneath — reads and edits your files, runs commands, plans multi-step work, delegates to subagents, and asks before anything risky.
4. Then switch the composer to Image: sizes 1:1, 4:3, 3:4, 16:9, 9:16; styles Photography, Illustration, 3D Render, Anime, Ink painting.
5. Or switch to Video: 16:9, 9:16, 1:1, and durations up to 10 seconds. Generated media is saved to your workspace `outputs/` folder and shown right in the conversation.
6. One account covers all of it — text, image, and video. The sidebar shows your balance and lets you switch models without a restart.
7. Built on DeepSeek Harness, the MIT-licensed open-source agent harness from DeepSeek AI. One login on top, everything else unchanged.
8. Invite links are in the sidebar if you want to bring someone along.
9. Download: <your release URL> · Threerouter account: https://www.threerouter.com/register

**Reddit (r/StableDiffusion, r/comfyui, r/LocalLLaMA, r/ChatGPTCoding):**

**Title:** We built a desktop agent that does coding *and* image/video generation behind one login

**Body:**

Deepseek Harness for Threerouter is a desktop app built on DeepSeek Harness (the MIT-licensed open-source agent harness from DeepSeek AI). We added a Threerouter integration layer so the whole thing runs off one account.

What that means in practice: you sign in with a Threerouter account and the app creates or reuses your API key, registers the model routes, loads your available models, and picks a default — no key pasting, no endpoint config. From there the composer has three modes. Text runs the coding agent (edits files, runs commands, subagents, approval prompts). Image and Video generate media through Threerouter's unified media API, with size/style/aspect/duration controls, and results are saved into your workspace `outputs/` folder and shown in the conversation.

It is a developer preview, so expect rough edges and breaking changes. Happy to answer questions about how the media pipeline or the agent loop works.

**Product Hunt:**

**Tagline (58 chars):** One login for a coding agent, image and video generation

**Description:** Deepseek Harness for Threerouter is a desktop AI app for coding, image generation, and video generation. Sign in with your Threerouter account and your API key, model list, and default model are configured automatically — nothing to paste. Code with an agent that reads and edits your files, then switch the composer to Image or Video and generate media into the same workspace. Built on DeepSeek Harness, MIT licensed.

**LinkedIn:**

The friction in AI desktop tools is rarely the model — it is the setup. Find a key, paste it, pick an endpoint, discover the model name is wrong.

Deepseek Harness for Threerouter removes that step. Sign in with a Threerouter account and the application provisions the API key, registers the model routes, loads the models your account can use, and selects a default. No key handling, no endpoint configuration.

Then it does two jobs in one window. Text mode runs a coding agent that reads and edits files, runs commands, plans multi-step work, and delegates to subagents, with approval prompts before risky operations. Image and Video modes generate media from the same composer — sizes, styles, aspect ratios, and durations — saving results into your workspace and displaying them in the conversation.

It is built on DeepSeek Harness, the open-source MIT-licensed agent harness from DeepSeek AI, with a Threerouter integration layer on top. One account, one balance, one app.

**Discord / community announcement:**

**Title:** Deepseek Harness for Threerouter is available

You can now run DeepSeek Harness as a desktop app with Threerouter built in.

Sign in with your Threerouter account and the app configures your API key, model list, and default model automatically. Then use it two ways in the same window: Text mode for the coding agent (files, commands, subagents, approvals), or Image and Video modes to generate media with size, style, aspect, and duration controls. Generated media is saved to your workspace `outputs/` folder.

It is a developer preview — expect breaking changes. Report issues and ask questions here.

**60-second demo script (screen recording):**

1. Open the app on a blank session. Point at the Threerouter hero title. *(3s)*
2. Click the account pill, sign in with a demo account. *(8s)*
3. Show the pill: "API key ready", balance visible, default model `deepseek-v4-pro`. Say: "That was the entire setup." *(6s)*
4. Type a coding task, let the agent edit a file and run a command, show one approval prompt. *(15s)*
5. Switch the composer tab to Image, pick 16:9 and Illustration, generate. *(12s)*
6. Switch to Video, pick 5s, generate; show the result in the conversation and the file in `outputs/`. *(12s)*
7. Open the sidebar pill, switch models, show the invite link. *(4s)*

### T7. Demo assets (Threerouter track)

1. **The setup GIF (highest value):** sign-in → account pill showing "API key ready" → first message sent. Under 15 seconds. This is the whole pitch.
2. **Mode-switch GIF:** one prompt, three tabs — Text, Image, Video — showing three different outputs.
3. **Outputs-folder clip:** generated media appearing in the conversation and on disk.
4. **Comparison still:** the same task in a generic client (key pasting, endpoint fields) versus this app (one login).

### T8. Invite and referral loop

The sidebar exposes a share invite link per account. Copy to pair with it:

- **In-app / share sheet:** "Share your invite link — friends get started with one login, no API key to copy."
- **Social:** "If you want to try it, here is my invite link: <link>. Sign in and you are ready to generate."
- **Rules:** disclose that the link is a referral link, never promise earnings or specific rewards, and never present the link as a discount you cannot substantiate.

### T9. Guardrails (Threerouter track)

Do:

- Say **"Deepseek Harness for Threerouter"** and immediately clarify it is DeepSeek Harness (by DeepSeek AI, MIT) plus a Threerouter integration layer.
- Keep upstream attribution: link the DeepSeek Harness repository, the MIT license, and [SAFETY.md](../SAFETY.md) on every download page.
- Write the price line as **"1$ ≈ 30M token"**, always with the approximation mark, and add "pricing may change".
- State that media generation is priced by the model chosen, separately from the text rate.
- Label the app a **developer preview** with breaking changes, as upstream does.

Do not:

- Imply DeepSeek endorses, operates, or supports Threerouter. The upstream project is a separate open-source codebase.
- Claim a guaranteed token rate, guaranteed uptime, or "unlimited" anything.
- Advertise installers before a signed public release actually exists.
- Show a real API key, account balance, or email address in any screenshot or recording.
- Describe the app as secure or as sandbox-guaranteed: it executes model-generated code and commands.

### T10. Internal note: rotate the keys before you record anything

`~/.dsh/profiles/desktop/cordis.patch.yml` currently holds live Threerouter and Wanx API keys in plaintext, and the desktop profile links the two plugins by absolute local path. Before any screen recording, screenshot, or repository push: rotate both keys, move them to the credential store or environment variables, replace the `link:` dependencies with a reproducible install path, and re-check the profile patch for anything else that should not be published. The desktop profile's `pnpm-lock.yaml` and `cordis.yml` should be reviewed the same way.

## Part II — Upstream DeepSeek Harness (developer and OSS track)

The sections below promote `dsh` itself, the MIT-licensed agent harness from DeepSeek AI, for the developer audience that reads architecture rather than feature lists.

## 1. Positioning

**One-sentence positioning.** DeepSeek Harness is an MIT-licensed agent harness where every part of the agent — model adapter, tools, session log, and the agent loop itself — is a plugin you can replace from configuration.

**Category.** Open-source agent harness / agent runtime for coding and automation.

**Who it is for.** (a) developers who want an agent they can rewire instead of fork, (b) teams that need a durable, inspectable session record, (c) plugin authors who want a real extension surface, (d) researchers comparing agent architectures.

**What it is not.** Not a hosted product, not a model, not a prompt library, and not production-ready: it is developer-preview software with deliberate breaking changes ([SAFETY.md](../SAFETY.md)).

## 2. Taglines

Pick one per channel; the first is the default.

1. **Everything is a plugin.**
2. Don't fork the agent — mount a plugin.
3. An agent harness you rewire from configuration.
4. Every part of the agent is replaceable, including the loop.
5. Compose your own coding agent, one plugin at a time.

Supporting subhead: *Open source (MIT) · Runs locally · Web UI, CLI, SDK, and desktop.*

## 3. Elevator pitches

**25 words.** DeepSeek Harness is an open-source agent harness where everything is a plugin: swap the model, the tools, or the agent loop itself from a YAML patch.

**50 words.** DeepSeek Harness is DeepSeek AI's open-source (MIT) agent harness, built on Cordis. Model adapters, tools, the session log, and the agent loop are all plugins mounted on a shared context, so extending it means adding a plugin beside the others — not patching a privileged core. Start with one command: `npx @deepseek-ai/dsh web`.

**100 words.** DeepSeek Harness is DeepSeek AI's open-source agent harness. It is built on Cordis, and it takes "everything is a plugin" literally: the model adapter, the tool registry, the session log, the sandbox and approval policy, and the agent loop are all plugins that contribute services and typed events to one shared context, and unload cleanly as reversible effects. That means you extend the agent by mounting a plugin rather than forking it, and you reconfigure it by patching a config row rather than rebuilding it. It ships a Web UI, a headless runner, TypeScript and Python SDKs, an ACP server, and an Electron desktop app. MIT licensed, developer preview.

## 4. Why it is different

Four claims, each with its proof in the repository.

**1. There is no privileged core to patch.** Model adapter, tool registry, session log, and `agent-loop` are all plugins ([docs/architecture.md](../docs/architecture.md)). Registrations are effects that unwind when their plugin unloads, so uninstalling a capability is a real operation, not a reverse patch.

**2. Capability seams beat provider forks.** A capability has three roles — Service Definition, Service Provider, Consumer. Filesystem and subprocess providers share one execution world, so pointing them at a remote sandbox moves Bash, persistent terminals, and LSP with them, with no fork of any tool ([docs/capability-seams.md](../docs/capability-seams.md)).

**3. A running agent is a composed profile.** `web`, `headless`, `sdk`, `sdk-minimal`, and `acp` are ordered stacks of bundle layers plus your own patch files, and `dsh --dump-config` prints the exact tree your machine boots — every row replaceable ([apps/cli/README.md](../apps/cli/README.md)).

**4. Sessions are durable and reconstructable.** The session log is append-only and is the source of what the model saw: anything model-visible is logged, verified by a runtime invariant. Fork, resume, transcripts, and telemetry all derive from the same settlements, and released formats migrate through version-named successors rather than in-place rewrites ([docs/architecture.md](../docs/architecture.md)).

## 5. Feature bullets (user-facing)

- **One command to start:** `npx @deepseek-ai/dsh web` serves the Web UI at `http://127.0.0.1:3080`.
- **Bring your own model:** DeepSeek models plus any OpenAI-compatible endpoint, configured in Settings → Models without a restart.
- **Real workspace work:** read and edit files, run shell commands, use language servers, keep persistent terminals, and target SSH hosts.
- **Delegation built in:** subagents, background jobs, plans, goals, schedules, webhook-triggered sessions, and an opt-in Agent Teams coordination layer.
- **Extensible by design:** skills, MCP servers, browser and computer use, and out-of-tree plugins installed per profile.
- **Guarded execution:** sandboxing, approval prompts, and a permission policy — with the honest caveat that they reduce risk rather than guarantee isolation.
- **Five profiles, one launcher:** Web, headless one-shot, TypeScript SDK, minimal SDK, and ACP automation, plus an Electron desktop app.
- **Two SDKs:** TypeScript and Python, both projecting the same agent loop.
- **MIT licensed** and developed in the open by DeepSeek AI.

## 6. Proof points for a developer audience

Use these when the audience will check the claims (Hacker News, Lobsters, engineering blogs).

- Built on Cordis; the underlying paradigm is described in *A Programming Paradigm for Spatiotemporal Composability* (arXiv).
- Model-visible ⟺ logged, enforced by a runtime invariant rather than by convention.
- Per-file 100% coverage gate in CI; snapshot replay tests run keyless against recorded sessions.
- Generated catalogs for tools, config, events, and the Cordis API keep documentation tied to source.
- Third-party dependency licenses disclosed in `THIRD_PARTY_NOTICES.md`; MIT throughout.
- Developer preview with explicit compatibility warnings, and a safety notice that states the sandbox's limits up front.

## 7. Channel-ready copy

### 7.1 Show HN

**Title:** Show HN: DeepSeek Harness – an open-source agent harness where everything is a plugin

**Body:**

We built DeepSeek Harness (`dsh`) as an agent harness with no privileged core. The model adapter, tool registry, session log, sandbox policy, and the agent loop itself are plugins mounted on a shared Cordis context, so you extend the agent by adding a plugin beside the others instead of forking it.

`npx @deepseek-ai/dsh web` starts a local Web UI. There is also a headless one-shot profile, TypeScript and Python SDKs, an ACP profile for automation clients, and an Electron desktop app.

A few things we think are worth a look: capability seams, where swapping the filesystem and subprocess providers moves Bash, PTY, and LSP to a remote sandbox with no tool forks; `dsh --dump-config`, which prints the exact plugin tree your machine boots so any row can be patched; and a session log where anything model-visible is guaranteed to be logged, which is what makes fork, resume, and replay trustworthy.

It is MIT licensed and in developer preview — expect breaking changes, and read SAFETY.md before running it. We would rather hear where the architecture is wrong now than after it hardens. Docs: https://deepseek-harness.github.io/deepseek-harness/

**Author's first comment:**

Two design decisions we argued about most, in case they are useful:

1. No privileged core. We paid for this in complexity: boot is a layered composition of bundles plus patch files, and profile resolution is real machinery. The payoff is that replacing the agent loop is configuration, not a fork.

2. Model-visible ⟺ logged. Every input that reaches a model request must be reconstructable from the session log, asserted at runtime. It constrains plugins — a new model-visible input requires a session event — and it is why transcripts, forking, and telemetry all agree.

Happy to answer anything about the plugin model, the session format, or where it is still rough.

### 7.2 X / Twitter thread

1. DeepSeek Harness is open source. It is an agent harness where **everything is a plugin** — including the agent loop. MIT, runs locally, one command to start. 🧵
2. `npx @deepseek-ai/dsh web` → Web UI on 127.0.0.1:3080. Model adapter, tools, session log, sandbox policy, loop: all plugins on one shared context, all unloadable.
3. No privileged core. You do not patch dsh to extend it — you mount a plugin beside the others. Registrations are effects that unwind on unload.
4. Seams, not forks: point the filesystem and subprocess providers at a remote sandbox and Bash, persistent terminals, and LSP move with them. No tool forks.
5. `dsh --dump-config` prints the plugin tree your machine boots. Any row is replaceable by a patch. Profiles: web, headless, sdk, sdk-minimal, acp.
6. Sessions are append-only, and anything model-visible is logged — enforced at runtime. That is what makes resume, fork, transcripts, and replay line up.
7. Also: subagents, background jobs, skills, MCP, browser and computer use, TS + Python SDKs, and an Electron desktop app.
8. Developer preview: breaking changes will happen, and sandboxing reduces risk rather than guaranteeing isolation. Read SAFETY.md first.
9. Docs: https://deepseek-harness.github.io/deepseek-harness/ · Discord: https://discord.gg/Ycq5dCaS4 · Star or file an issue: https://github.com/deepseek-ai/deepseek-harness

### 7.3 LinkedIn

Most coding agents are products you configure. DeepSeek Harness is an agent you compose.

We have open sourced it under MIT. It is built on Cordis, and it takes "everything is a plugin" seriously: the model adapter, the tool registry, the session log, the sandbox and approval policy, and the agent loop are all plugins contributing to one shared context. Extending it means mounting a plugin beside the others; replacing a capability means patching a config row — not maintaining a fork.

Two things I would point engineers to:

- **Capability seams.** A capability has a definition, a provider, and a consumer. Swap the filesystem and subprocess providers for a remote sandbox, and Bash, persistent terminals, and language servers move with them, with no tool forks.
- **A session log you can trust.** Anything model-visible is logged, asserted at runtime, which is what makes resume, fork, and replay dependable.

It ships a Web UI, a headless runner, TypeScript and Python SDKs, an ACP profile, and a desktop app. It is a developer preview: expect breaking changes, and read the safety notice before pointing it at anything you care about.

Docs: https://deepseek-harness.github.io/deepseek-harness/

### 7.4 Reddit (r/LocalLLaMA, r/ChatGPTCoding, r/LLMDevs)

**Title:** DeepSeek open-sourced their agent harness — everything is a plugin, including the agent loop

**Body:**

DeepSeek Harness (`dsh`) is MIT licensed and runs locally. The pitch is architectural rather than feature-count: there is no privileged core. The model adapter, tool registry, session log, sandbox policy, and the agent loop are all plugins on a shared Cordis context, so you extend it by mounting a plugin, and you reconfigure it by patching a config row.

Quick start: `npx @deepseek-ai/dsh web` (Web UI on 127.0.0.1:3080). There is also a headless profile, TS/Python SDKs, and an ACP profile for automation clients.

Things this crowd may care about: it takes any OpenAI-compatible endpoint as well as DeepSeek's API; sandboxing and approval prompts are configurable policy, not a hard guarantee; subagents, background jobs, MCP servers, skills, and browser/computer use are all plugins you can drop.

Fair warning: developer preview, breaking changes expected, not security audited. Happy to answer questions about the plugin model or the session format.

### 7.5 Product Hunt

**Tagline (54 chars):** Open-source agent harness where everything is a plugin

**Description:** DeepSeek Harness is an MIT-licensed agent harness from DeepSeek AI. Every part of the agent — model adapter, tools, session log, sandbox policy, and the agent loop itself — is a plugin you can swap from configuration. Start locally with one command and get a Web UI, a headless runner, TypeScript and Python SDKs, and a desktop app. Built on Cordis. Developer preview.

### 7.6 GitHub Discussions / Discord announcement

**Title:** DeepSeek Harness is now open source — everything is a plugin

We have opened up DeepSeek Harness under the MIT license.

`dsh` is an agent harness built on Cordis where the model adapter, tool registry, session log, sandbox and approval policy, and the agent loop are all plugins. There is no privileged core to patch: you extend it by mounting a plugin, and you reconfigure it by patching a config row. `dsh --dump-config` shows exactly what your machine boots.

Get started: `npx @deepseek-ai/dsh web`, then see the Web UI guide. Run from source with `pnpm install && pnpm run build && pnpm dsh web`.

If you build a plugin, add the `dsh-plugin` topic to your repository so others can find it. Feedback and bug reports go to GitHub Discussions; the Discord is the fastest place to ask questions.

It is a developer preview: expect breaking changes, and read SAFETY.md before running it on anything you care about.

### 7.7 Short blurbs

**50 words (newsletter / directory):** DeepSeek Harness is DeepSeek AI's MIT-licensed agent harness, built on Cordis. The model adapter, tools, session log, sandbox policy, and the agent loop are all plugins on one shared context, so you extend it by mounting a plugin instead of forking it. Web UI, CLI, SDKs, desktop.

**One line (awesome-lists):** DeepSeek Harness — open-source agent harness where model adapters, tools, sessions, and the agent loop are all replaceable plugins (MIT).

## 8. Demo assets to produce

1. **90-second screencast:** install → paste API key → choose workspace → run a task → show an approval prompt → open the plugin tree → patch one config row and reload.
2. **30-second GIF:** `dsh --dump-config`, then editing one row in `cordis.patch.yml` and watching the reload apply it. This is the "everything is a plugin" claim made visual.
3. **Architecture diagram:** the turn flow from `docs/architecture.md`, annotated for a general audience (claim → assemble → stream → tools → step/turn).
4. **Side-by-side swap:** the same task run against two model routes, showing that only config changed.
5. **Terminal recording:** `npx @deepseek-ai/dsh web` to first working session, under 60 seconds, no cuts.

## 9. Launch sequence

| When | Channel | Asset |
|---|---|---|
| T-7 days | Discord + GitHub Discussions | Pre-announcement, invite early plugin authors |
| T-7 days | Docs site | Confirm quickstart works on a clean machine for macOS, Linux, Windows |
| T-1 day | X, LinkedIn | Teaser: the "no privileged core" diagram |
| T-0 | Hacker News | Show HN post + author's first comment, then answer for the day |
| T-0 | X | Full thread, pinned |
| T+0h | Reddit | r/LocalLLaMA and r/LLMDevs, adapted per community rules |
| T+1 day | LinkedIn | Composed-agent post |
| T+2 days | Product Hunt | Launch with the screencast as the first media |
| T+3 days | Chinese channels | V2EX, Juejin, Zhihu, Bilibili, WeChat — translated, not machine-copied |
| T+7 days | Blog / Dev.to | "Why there is no privileged core in our agent harness" — the architecture argument |
| Ongoing | Plugin ecosystem | Curate the `dsh-plugin` topic; feature one community plugin per week |

**Measure:** GitHub stars and clones, npm downloads for `@deepseek-ai/dsh`, Discord joins, Discussions opened, plugins carrying the `dsh-plugin` topic, and first-session completion time from a clean machine.

## 10. Messaging guardrails

Do:

- State "developer preview" and "expect breaking changes" in every long-form post.
- Link [SAFETY.md](../SAFETY.md) whenever you describe execution, sandboxing, or credentials.
- Lead with the architecture claim; it is the thing that is actually unusual.
- Name the exact mechanism (plugin, seam, profile, session event) rather than adjectives.

Do not:

- Call it production-ready, secure, or sandbox-guaranteed.
- Compare it to other harnesses with superlatives you cannot show a benchmark for.
- Advertise desktop installers unless a signed public release actually exists.
- Promise API or session-format stability.
- Say "everything is a plugin" without the follow-up that composition happens through profiles and patch layers.

**Standard footnote for launch posts:**

> DeepSeek Harness is experimental developer-preview software, provided under the MIT license without warranty. It can execute model-generated code and commands and access files, credentials, and the network. Sandboxing and approval prompts reduce risk but do not guarantee isolation. Review SAFETY.md before use.

## 11. Optional hero rewrite for README and the docs site

Current README opens with what the project *is*. A launch-facing variant leads with what it *does differently*:

> # DeepSeek Harness
>
> **An open-source agent harness where everything is a plugin.**
>
> DeepSeek Harness (`dsh`) is built by DeepSeek AI on Cordis. The model adapter, tool registry, session log, sandbox and approval policy, and the agent loop are all plugins contributing to one shared context — so you extend the agent by mounting a plugin instead of forking it, and you reconfigure it by patching a config row instead of rebuilding it.
>
> ```sh
> npx @deepseek-ai/dsh web
> ```
>
> Web UI, headless runner, TypeScript and Python SDKs, and an ACP profile for automation clients. MIT licensed. Developer preview — expect breaking changes; read the safety notice first.

Keep the existing warning block and community links below it; the `Developer preview` and `Community and support` sections already carry the honesty the campaign needs.
