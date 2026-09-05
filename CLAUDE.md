# AI Assistant Guide

This file provides guidance to AI coding assistants when working with code in this repository. Adherence to these guidelines is crucial for maintaining code quality and consistency.

## Repository: Cherry Studio Intranet Edition

This repository (`cherry-studio-intranet`) is an **enterprise intranet fork** of [Cherry Studio](https://github.com/CherryHQ/cherry-studio). It tracks upstream `v1` and selectively adapts upstream fixes via `sync/upstream-*` branches. Last fully aligned tag: **upstream v1.9.11** (package version `1.9.11`); later partial sync decisions are recorded in `INTRANET_CHANGES.md`.

The fork disables public-network-facing surfaces (auto-update, telemetry, marketplace, external links) and enforces a **central network allowlist** so the app only talks to explicitly-approved endpoints. When touching network, provider, or build code, follow the intranet constraints below.

**Key intranet docs (read these first):**

| Doc | Purpose |
|---|---|
| `CONTEXT.md` | Domain glossary + network policy (intranet ≠ localhost-only) |
| `INTRANET_CHANGES.md` | Fork-specific change log + per-change upstream-sync recommendations |
| `docs/intranet-deployment.md` | Build & deployment guide |
| `docs/intranet-network-audit.md` | Network egress audit |
| `docs/intranet-test-report.md` | Acceptance test coverage |

The remaining sections describe the shared architecture inherited from upstream (still accurate — the code layout is identical) plus the intranet-specific sections flagged below.

## Guiding Principles (MUST FOLLOW)

- **Keep it clear**: Write code that is easy to read, maintain, and explain.
- **Match the house style**: Reuse existing patterns, naming, and conventions.
- **Search smart**: Prefer `ast-grep` for semantic queries; fall back to `rg`/`grep` when needed.
- **Log centrally**: Route all logging through `loggerService` with the right context—no `console.log`.
- **Research via subagent**: Lean on `subagent` for external docs, APIs, news, and references.
- **Always propose before executing**: Before making any changes, clearly explain your planned approach and wait for explicit user approval to ensure alignment and prevent unwanted modifications.
- **Lint, test, and format before completion**: Coding tasks are only complete after running `pnpm lint`, `pnpm test`, and `pnpm format` successfully.
- **Write conventional commits**: Commit small, focused changes using Conventional Commit messages (e.g., `feat:`, `fix:`, `refactor:`, `docs:`).
- **Sign commits**: Use `git commit --signoff` as required by contributor guidelines.

## Intranet Network Policy & Build Modes (CRITICAL)

This is the single most important constraint in this fork. Read it before touching anything that makes an HTTP/WS request or ships a build.

### Build-mode environment variables

All read via `packages/shared/config/intranet.ts` (checks `process.env` and `VITE_`-prefixed variants):

| Variable | Effect |
|---|---|
| `CHERRY_INTRANET_MODE` | Intranet mode (primary for this repo). Enables offline-mode network guards. |
| `CHERRY_OFFLINE_MODE` | Fully-offline mode (same family). Stricter posture intended for air-gapped builds. |
| `CHERRY_DISABLE_PUBLIC_NETWORK` | Force `isPublicNetworkDisabled()` true even outside offline mode. |
| `CHERRY_DISABLE_AUTO_UPDATE` | Hard-disable the auto-updater product surface. |
| `CHERRY_DISABLE_TELEMETRY` | Hard-disable telemetry product surface. |
| `CHERRY_DISABLE_MARKETPLACE` | Hard-disable the MCP marketplace surface. |
| `CHERRY_DISABLE_EXTERNAL_LINKS` | Hard-disable external links (about page, etc.). |
| `CHERRY_NETWORK_ALLOWLIST` | Comma/newline-separated hostnames used to **seed** the allowlist on first launch (runtime policy lives in Settings). |

> The `CHERRY_DISABLE_*` switches are independent of `CHERRY_INTRANET_MODE` — they are not auto-enabled by it. The intranet release CI sets them explicitly (see Intranet Build & Release).

### Network policy (deny-all + central guard)

When `isPublicNetworkDisabled()` is true (offline/intranet mode, or `CHERRY_DISABLE_PUBLIC_NETWORK`), **all** outbound HTTP(S)/WS(S) is denied unless it matches the allowlist. Enforcement funnels through one central guard:

- **Guard**: `assertNetworkAllowed(url)` in `packages/shared/config/intranet.ts`.
- **Interception points (all route through the same guard):**
  - Main-process `globalThis.fetch` and `electron.net.fetch` — `src/main/network/intranetNetworkGuard.ts` (`installMainIntranetNetworkGuard`).
  - Renderer / webview `<session>.webRequest.onBeforeRequest` — `installSessionIntranetNetworkGuard`.
- **Allowlist rules**: `packages/shared/network/networkAllowlist.ts` — matches **hostnames only** (supports `*.corp.example.com` wildcards and IPs); protocols limited to `http`/`https`/`ws`/`wss`; URLs carrying credentials are rejected.
- **Storage**: `src/main/services/IntranetNetworkAllowlistService.ts` persists rules under ConfigManager key `intranetNetworkAllowlist`; seeds from `CHERRY_NETWORK_ALLOWLIST` on first launch.
- **UI**: Settings → General → Intranet network allowlist (设置 → 通用 → 内网网络白名单).

**Key principle: intranet mode is NOT localhost-only.** Users configure the real API address in provider settings; the runtime trusts any host on the allowlist — including enterprise gateways, SearXNG, WebDAV, and internal domains. Public-internet unreachability is enforced by enterprise DNS/firewall/proxy, not by hard-coded localhost rules. See `CONTEXT.md`.

### Editing rules

- Any **new** outbound request must go through the central guard — do not bypass `assertNetworkAllowed`, and do not add a raw `fetch` / `net.fetch` / `session.loadURL` path that skips it.
- When adding a **model provider endpoint**, ensure its `apiHost` / `anthropicApiHost` is reachable via the allowlist.
- The built-in **CherryAI provider is replaced by the enterprise intranet model service** (`企业内网模型服务`, OpenAI-compatible, default `http://llm-gateway.intranet.local/v1`). Relevant files: `src/renderer/src/config/providers.ts`, `src/renderer/src/config/models/default.ts`, `src/renderer/src/config/models/intranet.ts`, `packages/shared/config/providerEndpoints.ts`, `packages/shared/config/intranet.ts`.
- Intranet mode **skips** the upstream `PrivacyPolicyUpdateNotice` and does not force-enable data collection.

## Pull Request Workflow (CRITICAL)

When creating a Pull Request, you MUST use the `gh-create-pr` skill.
If the skill is unavailable, directly read `.agents/skills/gh-create-pr/SKILL.md` and follow it manually.

## Review Workflow

When reviewing a Pull Request, do NOT run `pnpm lint`, `pnpm test`, or `pnpm format` locally.
Instead, check CI status directly using GitHub CLI:

- **Check CI status**: `gh pr checks <PR_NUMBER>` - View all CI check results for the PR
- **Check PR details**: `gh pr view <PR_NUMBER>` - View PR status, reviews, and merge readiness
- **View failed logs**: `gh run view <RUN_ID> --log-failed` - Inspect logs for failed CI runs

Only investigate CI failures by reading the logs, not by re-running checks locally.

## Issue Workflow

When creating an Issue, you MUST use the `gh-create-issue` skill.
If the skill is unavailable, directly read `.agents/skills/gh-create-issue/SKILL.md` and follow it manually.

### Branch Strategy

This fork is maintained on `main`; intranet fixes land via `hotfix/intranet-*` branches. There is **no local `v2` branch** — that line lives only in upstream (`CherryHQ/cherry-studio`), and this repo does not develop against it.

Upstream context (verified 2026-09-05): `v1` is the maintenance line; `main` contains v2 development. These upstream branch names do not change this fork's intranet `main` workflow.

### Upstream Sync

This fork tracks upstream `CherryHQ/cherry-studio` `v1` and adapts fixes via `sync/upstream-*` branches. Upstream `main` now contains the v2 development line and is not a drop-in sync target.

- `scripts/__tests__/upstream-sync.test.ts` audits `upstream/v1` against applied, adapted, and explicitly excluded decisions. Passing this check means no unaudited commits; it does not mean every upstream change was imported or a newer release tag is fully aligned.
- `INTRANET_CHANGES.md` records every fork-specific change with a sync recommendation per item: **⭐ can sync upstream** / **❌ intranet-only** / **⚠️ needs team confirmation**.
- **Before syncing**: consult `INTRANET_CHANGES.md` and the Intranet Network Policy section above to avoid clobbering intranet-only logic (network guards, allowlist, provider replacement, disabled surfaces).

## Development Commands

- **Install**: `pnpm install` — Install all project dependencies (requires Node 24.11.1, see `.nvmrc`; pnpm 10.27.0 via corepack)
- **Development**: `pnpm dev` — Runs Electron app in development mode with hot reload
- **Debug**: `pnpm debug` — Starts with debugging; attach via `chrome://inspect` on port 9222
- **Build Check**: `pnpm build:check` — **REQUIRED** before commits (`pnpm lint && pnpm test`)
  - If having i18n sort issues, run `pnpm i18n:sync` first
  - If having formatting issues, run `pnpm format` first
- **Full Build**: `pnpm build` — TypeScript typecheck + electron-vite build
- **Test**: `pnpm test` — Run all Vitest tests (main + renderer + aiCore + shared + scripts)
  - `pnpm test:main` — Main process tests only (Node environment)
  - `pnpm test:renderer` — Renderer process tests only (jsdom environment)
  - `pnpm test:aicore` — aiCore package tests only
  - `pnpm test:watch` — Watch mode
  - `pnpm test:coverage` — With v8 coverage report
  - `pnpm test:e2e` — Playwright end-to-end tests
- **Lint**: `pnpm lint` — oxlint + eslint fix + TypeScript typecheck + i18n check + format check
- **Format**: `pnpm format` — Biome format + lint (write mode)
- **Typecheck**: `pnpm typecheck` — Concurrent node + web TypeScript checks using `tsgo`
- **i18n**:
  - `pnpm i18n:sync` — Sync i18n template keys
  - `pnpm i18n:translate` — Auto-translate missing keys
  - `pnpm i18n:check` — Validate i18n completeness
- **Bundle Analysis**: `pnpm analyze:renderer` / `pnpm analyze:main` — Visualize bundle sizes
- **Agents DB**:
  - `pnpm agents:generate` — Generate Drizzle migrations
  - `pnpm agents:push` — Push schema to SQLite DB
  - `pnpm agents:studio` — Open Drizzle Studio
- **Intranet / Offline builds** (load `.env.intranet.example` + optional `.env.intranet` via `dotenv`; work without a local env file too):
  - `pnpm build:intranet` — Build in intranet mode
  - `pnpm package:mac:intranet` / `pnpm package:win:intranet` — Package intranet installers (macOS dmg/zip, Windows setup/portable)
  - `pnpm debug:intranet` — Debug run in intranet mode
  - `pnpm build:offline` / `pnpm package:mac:offline` / `pnpm package:win:offline` / `pnpm debug:offline` — Fully-offline equivalents (load `.env.offline.example` / `.env.offline`)
  - `pnpm i18n:hardcoded:strict` — Hardcoded-string check (`I18N_STRICT=true`); **required gate** for intranet releases

## Intranet Build & Release

### Build-time binary bundling (beforePack)

`electron-builder`'s `beforePack` hook (`scripts/before-pack.js`) downloads tool binaries into `resources/binaries/<platform>-<arch>/` so they ship inside the installer (`asarUnpack` already covers `resources/**`):

| Script | Content | Runtime consumer |
|---|---|---|
| `scripts/download-rtk-binaries.js` | `rtk` / `rtk.exe` | `extractRtkBinaries()` |
| `scripts/download-intranet-binaries.js` (needs `CHERRY_INTRANET_MODE=true`) | `uv` / `bun` / `openclaw` archives (+ OVMS zips on Windows x64) | `resources/scripts/install-*.js` → `local-binary.js` |

The intranet binaries are pulled from GitCode mirrors — this is a **build-time** egress, not a runtime network policy. If the build host is fully offline, drop the same-named archives into `resources/binaries/<platform>-<arch>/` before running `package:*:intranet`.

### Release workflow (`.github/workflows/intranet-release.yml`)

Triggers:

- Push to `main` → auto-generates an `intranet-v<package.version>-<short-sha>` tag and publishes a Release.
- Manual `workflow_dispatch` with an explicit release tag (e.g. `intranet-v1.9.4`).
- Tag push matching `v*` or `intranet-v*`.

Build matrix: `macos-latest` (dmg/zip, arm64 + x64) and `windows-2022` (setup/portable, x64 + arm64).

Gates & artifacts:

- `test-intranet-release` runs `pnpm lint` + `pnpm i18n:hardcoded:strict` + `pnpm test` first.
- `build-intranet-release` builds only after the gate passes, with `CHERRY_INTRANET_MODE=true` and `CHERRY_DISABLE_AUTO_UPDATE/TELEMETRY/MARKETPLACE/EXTERNAL_LINKS=true`.
- Artifacts are uploaded, then `publish-intranet-release` creates/updates the GitHub Release including a `SHA256SUMS.txt`.
- Optional Apple code-signing secrets: `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`. Without them the workflow keeps `CSC_IDENTITY_AUTO_DISCOVERY=false` and ships unsigned builds (suitable for intranet acceptance + secondary signing).

## Project Architecture

### Electron Structure

```
src/
  main/          # Node.js backend (Electron main process)
  renderer/      # React UI (Electron renderer process)
  preload/       # Secure IPC bridge (contextBridge)
packages/
  aiCore/        # @cherrystudio/ai-core — AI SDK middleware & provider abstraction
  shared/        # Cross-process types, constants, IPC channel definitions
  mcp-trace/     # OpenTelemetry tracing for MCP operations
  ai-sdk-provider/  # Custom AI SDK provider implementations
  extension-table-plus/  # TipTap table extension
```

### Key Path Aliases

| Alias | Resolves To |
|---|---|
| `@main` | `src/main/` |
| `@renderer` | `src/renderer/src/` |
| `@shared` | `packages/shared/` |
| `@types` | `src/renderer/src/types/` |
| `@logger` | `src/main/services/LoggerService` (main) / `src/renderer/src/services/LoggerService` (renderer) |
| `@mcp-trace/trace-core` | `packages/mcp-trace/trace-core/` |
| `@cherrystudio/ai-core` | `packages/aiCore/src/` |

### Main Process (`src/main/`)

Node.js backend services. Key services:

| Service | Responsibility |
|---|---|
| `WindowService` | Electron window lifecycle management |
| `MCPService` | Model Context Protocol server management |
| `KnowledgeService` | RAG / knowledge base (via `@cherrystudio/embedjs`) |
| `AnthropicService` | Anthropic API integration |
| `LoggerService` | Winston-based structured logging (daily rotate) |
| `StoreSyncService` | Syncs Redux state to/from main process |
| `BackupManager` | Data backup/restore (WebDAV, S3, Nutstore) |
| `ApiServerService` | Express HTTP API server (Swagger docs at `/api-docs`) |
| `AppUpdater` | electron-updater auto-update |
| `ShortcutService` | Global keyboard shortcuts |
| `ThemeService` | System theme detection/application |
| `SelectionService` | Text selection toolbar feature |
| `CopilotService` | GitHub Copilot OAuth integration |
| `PythonService` | Pyodide WASM Python runtime |
| `OvmsManager` | OpenVINO model server management |
| `NodeTraceService` | OpenTelemetry trace export |

Agents subsystem (`src/main/services/agents/`):
- Drizzle ORM + LibSQL (SQLite) schema at `database/schema/index.ts`
- Migrations in `resources/database/drizzle/`
- **Currently undergoing v2 refactor** — only critical bug fixes accepted

### Renderer Process (`src/renderer/src/`)

React 19 + Redux Toolkit SPA. Key structure:

```
aiCore/          # Legacy middleware pipeline (deprecated, migrating to packages/aiCore)
api/             # IPC call wrappers (typed electron API calls)
components/      # Shared UI components (Ant Design 5 + styled-components + TailwindCSS v4)
databases/       # Dexie (IndexedDB) — topics, files, message_blocks, etc.
hooks/           # React hooks (useAssistant, useChatContext, useModel, etc.)
pages/           # Route pages (home, settings, knowledge, paintings, notes, etc.)
services/        # Frontend services (ApiService, ModelService, MemoryService, etc.)
store/           # Redux Toolkit slices
types/           # TypeScript type definitions
workers/         # Web Workers
windows/         # Multi-window entry points (mini, selection toolbar, trace)
```

### Redux Store (`src/renderer/src/store/`)

Slices (redux-persist enabled):

| Slice | State |
|---|---|
| `assistants` | AI assistant configurations |
| `settings` | App-wide settings |
| `llm` | LLM provider/model configs |
| `mcp` | MCP server configs |
| `messageBlock` | Message block rendering state |
| `knowledge` | Knowledge base entries |
| `paintings` | Image generation state |
| `memory` | Memory system config |
| `websearch` | Web search settings |
| `shortcuts` | Keyboard shortcuts |
| `tabs` | Tab management |

> **BLOCKED**: Do not add new Redux slices or change existing state shape until v2.0.0.

### Database Layer

- **IndexedDB** (Dexie): `src/renderer/src/databases/index.ts`
  - Tables: `files`, `topics`, `settings`, `knowledge_notes`, `translate_history`, `quick_phrases`, `message_blocks`, `translate_languages`
  - Schema versioned with upgrade functions (`upgradeToV5`, `upgradeToV7`, `upgradeToV8`)
  - **BLOCKED**: Do not modify schema until v2.0.0.
- **SQLite** (Drizzle ORM + LibSQL): `src/main/services/agents/`
  - Used for the agents subsystem
  - DB path: `{userData}/Data/agents.db` (e.g., on macOS: `~/Library/Application Support/CherryStudioDev/Data/agents.db` in dev, `~/Library/Application Support/CherryStudio/Data/agents.db` in prod)

### IPC Communication

- Channel constants defined in `packages/shared/IpcChannel.ts`
- Renderer → Main: `ipcRenderer.invoke(IpcChannel.XXX, ...args)` via `api.*` wrappers in `src/preload/index.ts`
- Main → Renderer: `webContents.send(channel, data)`
- Tracing: `tracedInvoke()` in preload attaches OpenTelemetry span context to IPC calls
- Typed API surface exposed via `contextBridge` as `window.api`

### AI Core (`packages/aiCore/`)

The `@cherrystudio/ai-core` package abstracts AI SDK providers:

```
src/core/
  providers/    # Provider registry (HubProvider, factory, registry)
  middleware/   # LanguageModelV2Middleware pipeline (manager, wrapper)
  plugins/      # Built-in plugins
  runtime/      # Runtime execution
  options/      # Request option preparation
```

- Built on Vercel AI SDK v5 (`ai` package) with `LanguageModelV2Middleware`
- `HubProvider` aggregates multiple provider backends
- Supports: OpenAI, Anthropic, Google, Azure, Mistral, Bedrock, Vertex, Ollama, Perplexity, xAI, HuggingFace, Cerebras, OpenRouter, Copilot, and more
- Custom fork of openai package: `@cherrystudio/openai`

### Multi-Window Architecture

The renderer builds multiple HTML entry points:
- `index.html` — Main application window
- `miniWindow.html` — Compact floating window (`src/renderer/src/windows/mini/`)
- `selectionToolbar.html` — Text selection action toolbar
- `selectionAction.html` — Selection action popup
- `traceWindow.html` — MCP trace viewer

### Logging

```typescript
import { loggerService } from "@logger";
const logger = loggerService.withContext("moduleName");
// Renderer only: loggerService.initWindowSource('windowName') first
logger.info("message", CONTEXT);
logger.warn("message");
logger.error("message", error);
```

- Backend: Winston with daily log rotation
- Log files in `userData/logs/`
- Never use `console.log` — always use `loggerService`

### Tracing (OpenTelemetry)

- `packages/mcp-trace/` provides trace-core and trace-node/trace-web adapters
- `NodeTraceService` exports spans via OTLP HTTP
- `SpanCacheService` caches span entities for the trace viewer window
- IPC calls can carry span context via `tracedInvoke()`

## Tech Stack

| Layer | Technologies |
|---|---|
| Runtime | Electron 38, Node 24.11.1 |
| Frontend | React 19, TypeScript ~5.8 |
| UI | Ant Design 5.27, styled-components 6, TailwindCSS v4 |
| State | Redux Toolkit, redux-persist, Dexie (IndexedDB) |
| Rich Text | TipTap 3.2 (with Yjs collaboration) |
| AI SDK | Vercel AI SDK v5 (`ai`), `@cherrystudio/ai-core` |
| Build | electron-vite 5 with rolldown-vite 7 (experimental) |
| Test | Vitest 3 (unit), Playwright (e2e) |
| Lint/Format | ESLint 9, oxlint, Biome 2 |
| DB (main) | Drizzle ORM + LibSQL (SQLite) |
| DB (renderer) | Dexie (IndexedDB) |
| Logging | Winston + winston-daily-rotate-file |
| Tracing | OpenTelemetry |
| i18n | i18next + react-i18next |

## Conventions

### TypeScript

- Strict mode enabled; use `tsgo` (native TypeScript compiler preview) for typechecking
- Separate configs: `tsconfig.node.json` (main), `tsconfig.web.json` (renderer)
- Type definitions centralized in `src/renderer/src/types/` and `packages/shared/`

### Code Style

- Biome handles formatting (2-space indent, single quotes, trailing commas)
- oxlint + ESLint for linting; `simple-import-sort` enforces import order
- React hooks: `eslint-plugin-react-hooks` enforced
- No unused imports: `eslint-plugin-unused-imports`

### File Naming

- React components: `PascalCase.tsx`
- Services, hooks, utilities: `camelCase.ts`
- Test files: `*.test.ts` or `*.spec.ts` alongside source or in `__tests__/` subdirectory

### i18n

- All user-visible strings must use `i18next` — never hardcode UI strings
- Run `pnpm i18n:check` to validate; `pnpm i18n:sync` to add missing keys
- Locale files in `src/renderer/src/i18n/`

### Packages with Custom Patches

Several dependencies have patches in `patches/` — be careful when upgrading:
- `antd`, `@ai-sdk/google`, `@ai-sdk/openai`, `@anthropic-ai/vertex-sdk`
- `@google/genai`, `@langchain/core`, `@langchain/openai`
- `ollama-ai-provider-v2`, `electron-updater`, `epub`, `tesseract.js`
- `@anthropic-ai/claude-agent-sdk`

## Testing Guidelines

- Tests use Vitest 3 with project-based configuration
- Main process tests: Node environment, `tests/main.setup.ts`
- Renderer tests: jsdom environment, `tests/renderer.setup.ts`, `@testing-library/react`
- aiCore tests: separate `packages/aiCore/vitest.config.ts`
- All tests run without CI dependency (fully local)
- Coverage via v8 provider (`pnpm test:coverage`)
- **Features without tests are not considered complete**

## Important Notes

### V2 Refactoring in Progress

This fork remains on the v1 architecture and retains the following file-level freeze. Upstream maintenance now lives on `v1`; upstream `main` contains v2. Do not merge that development line into the intranet fork or create a local `v2` branch for this workflow.

Files marked with the following header are **blocked for feature changes**:

```typescript
/**
 * @deprecated Scheduled for removal in v2.0.0
 * ⚠️ NOTICE: V2 DATA&UI REFACTORING
 * STOP: Feature PRs affecting this file are currently BLOCKED.
 */
```

Do not introduce new features to these files. Bug fixes only.

### Security

- Never expose Node.js APIs directly to renderer; use `contextBridge` in preload
- Validate all IPC inputs in main process handlers
- URL sanitization via `strict-url-sanitise`
- IP validation via `ipaddr.js` (API server)
- `express-validator` for API server request validation

## Agent skills

### Issue tracker

Issues are tracked on GitHub. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses canonical triage role labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repository with root-level CONTEXT.md. See `docs/agents/domain.md`.

## Intranet Dev Environment

### Prerequisites

- **Node.js 24.11.1** (matches `.nvmrc` / `.node-version`). Activate with `nvm use` / `fnm use`.
- **pnpm 10.27.0** via corepack: `corepack enable`, then `pnpm --version`.
- Native prebuilt binaries (sharp, libsql, system-ocr, canvas, claude-agent-sdk's ripgrep, etc.) are resolved per platform/arch by `scripts/before-pack.js` during packaging — dev runs on your host platform generally need no manual native setup.

### First run

- Copy `.env.intranet.example` to `.env.intranet` and adjust hostnames to your enterprise network (see Intranet Network Policy). The intranet build commands load `.env.intranet.example` first, then `.env.intranet` overrides, so a missing local file still builds in intranet mode.
- `pnpm dev` runs the Electron app in dev mode; `pnpm debug:intranet` runs it under intranet-mode env.
- API errors appear if no provider API key/host is configured — expected, not a broken environment.

### Notes

- Keep `git config core.hooksPath` unset so the `pnpm install` prepare hook can install git hooks. If you see `Cowardly refusing to install hooks with core.hooksPath set`, run `git config --unset-all core.hooksPath` (local + global).
