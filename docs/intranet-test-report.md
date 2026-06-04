# 企业内网版测试报告

测试日期：2026-06-04

## 环境

- macOS 本地开发环境
- Node.js：`v24.11.1`
- pnpm：`10.27.0`
- 仓库要求 Node.js：`>=24.11.1`

说明：本机 Node.js 匹配 `.nvmrc`；测试、lint、typecheck 和格式化均已完成。

## 已执行命令

| 命令 | 结果 | 备注 |
|---|---|---|
| `CI=true corepack pnpm install --offline` | 未通过 | 本机 pnpm store 缺少 `@anthropic-ai/claude-agent-sdk@0.2.112` tarball |
| `CI=true corepack pnpm install --ignore-scripts` | 通过 | 用于恢复依赖链接；普通安装脚本阶段曾卡住，已改用跳过 scripts 的方式完成本地验证 |
| `pnpm exec vitest run --project shared packages/shared/config/intranet.test.ts` | 通过 | 内网域名/IP 白名单 matcher |
| `pnpm exec vitest run --project main src/main/services/__tests__/NetworkAllowlistConfigService.test.ts src/main/network/__tests__/intranetNetworkGuard.test.ts` | 通过 | config/env 种子和主进程中心 guard |
| `pnpm exec vitest run --project renderer src/renderer/src/pages/settings/__tests__/GeneralSettings.test.tsx src/renderer/src/config/__tests__/intranetDefaults.test.ts src/renderer/src/providers/WebSearchProvider/__tests__/WebSearchProviderFactory.intranet.test.ts` | 通过 | Settings UI 与 WebSearch upstream 行为恢复 |
| `pnpm exec vitest run scripts/__tests__/resource-localization.test.ts scripts/__tests__/installer-network-policy.test.ts` | 通过 | 本地资源和 installer 下载白名单 |
| `pnpm vitest run --project scripts scripts/__tests__/intranet-release-workflow.test.ts` | 通过 | GitHub Actions 发布 workflow、release 前测试门禁、main push 自动发布、metadata checkout、测试环境隔离、签名 secret 隔离、env 模板和 Windows portable target 校验 |
| `pnpm test` | 通过 | 261 个测试文件，4418 个测试通过，72 个跳过 |
| `pnpm lint` | 通过 | 包含 oxlint、eslint、typecheck、i18n:check、format |
| `pnpm format` | 通过 | Biome format/lint 无进一步修改 |
| `pnpm i18n:hardcoded:strict` | 通过 | 未发现硬编码 UI 文案 |
| `pnpm build:intranet` | 通过 | 完成 OpenAPI 生成、typecheck、electron-vite build |

## 覆盖点

- 内网模式默认 deny-all，白名单为空时拒绝全部 HTTP/HTTPS/WS/WSS。
- 白名单支持精确域名、DNS 边界通配符、精确 IP literal、URL 输入提取 hostname。
- 主进程 `session.webRequest`、`globalThis.fetch`、`electron.net.fetch` 共用同一 matcher。
- Settings -> General 读写 `intranetNetworkAllowlist`；`CHERRY_NETWORK_ALLOWLIST` 仅在 config key 不存在时首次种子化。
- 删除 renderer monkey patch、`safeRequest`、Provider endpoint 自动同步。
- 内网模式默认 provider 只展示企业内网模型服务和内网/本地可用 provider。
- WebSearch、MCP、OAuth、Backup、Knowledge、Updater、OpenClaw 不再因为 intranet mode 直接禁用，连接由中心 guard 决定。
- 公共 JS/CSS/wasm 资源改为本地打包资源；installer 优先使用 `resources/binaries/<platform-arch>`。
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
- 失败 run：`25597831904`
- 失败步骤：`metadata / Resolve release metadata`
- 根因：`metadata` job 在 checkout 前读取 `package.json`，分支 push 自动发布路径中无法解析 package version。
- 修复：`metadata` job 先执行 `actions/checkout`，再解析 release tag/version；新增测试覆盖步骤顺序。
- 失败 run：`25597907066`
- 失败步骤：`test-intranet-release / Run release quality gate`
- 根因：测试 job 全局设置了 `CHERRY_INTRANET_MODE=true` 等内网运行时变量，导致通用 provider/security 测试按内网模式运行。
- 修复：测试 job 只保留 `CI` 和 `NODE_OPTIONS`，内网运行时变量只在 build job 中生效；新增测试覆盖测试环境隔离。
- 失败 run：`25598065156`
- 失败步骤：`build-intranet-release (macos-latest) / Build intranet package`
- 根因：未配置签名 secret 时 workflow 仍把空的 `CSC_LINK`、`CSC_KEY_PASSWORD`、`APPLE_ID` 等变量传给 electron-builder，macOS 构建误进入证书处理后报 `not a file`。
- 修复：新增 `Configure optional code signing secrets` 步骤，仅当 secret 非空时写入 `GITHUB_ENV`；build step 默认只保留 `CSC_IDENTITY_AUTO_DISCOVERY=false`。

## 未在本机完成的验收

- Windows 安装包完全断网启动：需在 GitHub Actions `windows-latest` 产物或真实 Windows 内网环境验证。
- 抓包 5 分钟无公网 DNS/HTTP/HTTPS：需在打包应用启动后用企业抓包工具验证。
- 企业实际 LLM Gateway、SearXNG、WebDAV、MCP registry 联调：需接入企业内网服务后验收。
