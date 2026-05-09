# 企业内网版测试报告

测试日期：2026-05-09

## 环境

- macOS 本地开发环境
- Node.js：`v22.22.0`
- pnpm：`10.27.0`
- 仓库要求 Node.js：`>=24.11.1`

说明：本机 Node.js 低于仓库声明版本，因此所有命令均有 engine warning；测试、lint、typecheck 和构建均已完成。

## 已执行命令

| 命令 | 结果 | 备注 |
|---|---|---|
| `CI=true corepack pnpm install --offline` | 未通过 | 本机 pnpm store 缺少 `@anthropic-ai/claude-agent-sdk@0.2.112` tarball |
| `CI=true corepack pnpm install --ignore-scripts` | 通过 | 用于恢复依赖链接；普通安装脚本阶段曾卡住，已改用跳过 scripts 的方式完成本地验证 |
| `pnpm vitest run --project shared packages/shared/config/intranet.test.ts packages/shared/network/safeRequest.test.ts` | 通过 | allowlist 与 safe request 单测 |
| `pnpm vitest run --project renderer src/renderer/src/config/__tests__/intranetDefaults.test.ts src/renderer/src/store/__tests__/intranetMcp.test.ts` | 通过 | 内网 provider、Web Search、MCP 默认面 |
| `pnpm vitest run --project main src/main/services/__tests__/AppUpdater.test.ts --testNamePattern "intranet mode"` | 通过 | autoUpdater 内网模式 no-op |
| `pnpm vitest run --project scripts scripts/__tests__/intranet-release-workflow.test.ts` | 通过 | GitHub Actions 发布 workflow、release 前测试门禁、main push 自动发布、env 模板和 Windows portable target 校验 |
| `pnpm test` | 通过 | 240 个测试文件，4291 个测试通过，72 个跳过 |
| `pnpm lint` | 通过 | 包含 oxlint、eslint、typecheck、i18n:check、format；存在一个既有 warning：`ManageModelsPopup.tsx` 的 hook dependency |
| `pnpm format` | 通过 | Biome format/lint 无进一步修改 |
| `pnpm i18n:hardcoded:strict` | 通过 | 未发现硬编码 UI 文案 |
| `pnpm build:intranet` | 通过 | 完成 OpenAPI 生成、typecheck、electron-vite build |

## 覆盖点

- 默认内网 allowlist 放行 localhost/RFC1918 地址并阻断公网 host。
- `safeFetch`、`safeWebSocket` 在公网目标上阻断底层请求。
- 内网模式默认 provider 只展示企业内网模型服务和内网/本地可用 provider。
- Web Search 默认仅保留内网 SearXNG。
- MCP 自动安装/Marketplace 入口在内网模式下隐藏或不可达。
- autoUpdater 在内网模式下不初始化、不检查更新。
- GitHub Actions workflow 在 release 编译前先执行 `pnpm lint`、`pnpm i18n:hardcoded:strict`、`pnpm test`。
- GitHub Actions workflow 支持推送代码到 `main` 后自动生成内网版 Release。
- `.env.intranet.example` 已允许被 git 跟踪，避免 CI checkout 后缺失 env 模板。
- GitHub Actions workflow 只构建 macOS/Windows，并发布到 GitHub Release。
- Windows release target 包含 `portable` 免安装产物。

## GitHub Actions 失败修复记录

- 失败 run：`25597642781`
- 失败步骤：`test-intranet-release / Prepare intranet env file`
- 根因：workflow 执行 `cp .env.intranet.example .env.intranet`，但 `.env.intranet.example` 被 `.gitignore` 的 `.env.*` 规则忽略，未进入 GitHub checkout。
- 修复：`.gitignore` 增加 `!.env.intranet.example`，并把 `.env.intranet.example` 纳入提交；新增测试覆盖 env 模板可用性。

## 未在本机完成的验收

- Windows 安装包完全断网启动：需在 GitHub Actions `windows-latest` 产物或真实 Windows 内网环境验证。
- 抓包 5 分钟无公网 DNS/HTTP/HTTPS：需在打包应用启动后用企业抓包工具验证。
- 企业实际 LLM Gateway、SearXNG、WebDAV、MCP registry 联调：需接入企业内网服务后验收。
