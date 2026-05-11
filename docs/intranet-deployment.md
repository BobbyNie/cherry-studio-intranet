# 企业内网版部署说明

## 构建环境

要求：

- Node.js `>=24.11.1`
- pnpm `10.27.0`
- 已经在内网制品库或本机 pnpm store 中缓存依赖
- Windows 打包需在可构建 Windows artifact 的环境执行 Electron Builder

## 环境变量

复制 `.env.intranet.example` 为 `.env.intranet`，按企业内网实际域名调整：

```bash
CHERRY_INTRANET_MODE=true
CHERRY_DISABLE_PUBLIC_NETWORK=false
CHERRY_DISABLE_AUTO_UPDATE=true
CHERRY_DISABLE_TELEMETRY=true
CHERRY_DISABLE_MARKETPLACE=true
CHERRY_DISABLE_EXTERNAL_LINKS=true
CHERRY_NETWORK_ALLOWLIST=
```

`CHERRY_NETWORK_ALLOWLIST` 仅为历史兼容变量。当前内网版不在 App 内做域名/IP 白名单拦截，默认允许连接用户配置的任意模型 API、WebDAV、SearXNG、MCP HTTP 服务地址。公网不可达由企业内网物理边界、DNS、防火墙或代理策略保证。

## 默认内网服务

模型服务：

- 名称：`企业内网模型服务`
- 类型：OpenAI-compatible
- 默认地址：`http://llm-gateway.intranet.local/v1`
- 默认模型：`qwen-coder`, `deepseek-coder`, `glm-coder`, `embedding-model`, `rerank-model`

Web Search：

- 仅支持内网 SearXNG
- 默认地址：`http://searxng.intranet.local`

MCP：

- 保留手动 MCP Server 配置
- 自动安装、Marketplace、npx 搜索默认禁用
- 如需 npx/uvx/bunx，建议配置企业包仓库，例如 `http://npm-registry.intranet.local:4873`

## 构建命令

```bash
corepack pnpm install --offline
corepack pnpm build:intranet
corepack pnpm package:mac:intranet
corepack pnpm package:win:intranet
```

`build:intranet`、`package:mac:intranet`、`package:win:intranet` 会先加载 `.env.intranet.example`，再加载可选 `.env.intranet` 覆盖，因此没有本地 env 文件时也会按内网模式构建。

如果内网没有完整 pnpm store，请先在联网构建机执行依赖缓存同步，再把 pnpm store 和项目 lockfile 带入内网。

## GitHub Actions 自动发布

新增 workflow：`.github/workflows/intranet-release.yml`。

触发方式：

- 推送代码到 `main`：自动生成 `intranet-v<package.version>-<short-sha>` tag 并发布 Release
- 手动触发 `Intranet Release`，输入 release tag，例如 `intranet-v1.9.4`
- 推送 tag：`v*` 或 `intranet-v*`

构建矩阵：

- `macos-latest`：生成 macOS `dmg` 和 `zip`，包含 `arm64` / `x64`
- `windows-latest`：生成 Windows `setup.exe` 和 `portable.exe`，包含 `x64` / `arm64`

发布行为：

- `test-intranet-release` 先执行 `pnpm lint`、`pnpm i18n:hardcoded:strict`、`pnpm test`
- `build-intranet-release` 依赖测试门禁通过后才开始 macOS/Windows 编译
- 构建任务先上传 Actions artifact
- `publish-intranet-release` 统一下载全部 artifact
- 自动创建或更新 GitHub Release，并把 Release tag 指向触发 workflow 的 commit
- Release 中包含 `SHA256SUMS.txt`

可选签名 secret：

- `CSC_LINK`
- `CSC_KEY_PASSWORD`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`

如果未配置签名 secret，workflow 只保留 `CSC_IDENTITY_AUTO_DISCOVERY=false`，不会把空的签名变量传给 electron-builder，会生成未签名构建产物，适合内网验收和二次签名流程。

## 验收步骤

1. 启动应用，确认未配置模型时应用不崩溃，并提示配置内网模型。
2. 使用抓包工具观察 5 分钟，确认启动、设置、聊天等默认路径不会主动访问官方服务或第三方云服务。
3. 配置 `http://127.0.0.1:8000/v1` 或企业 LLM Gateway 后验证聊天、流式输出、多轮上下文。
4. 配置企业内网 OpenAI-compatible 域名，确认不需要额外 App 白名单即可访问。
5. 验证 Web Search 只显示内网 SearXNG。
6. 验证 MCP Marketplace、自动安装、npx 搜索入口不可见。
7. 验证点击关于页外链不会打开浏览器。
8. 验证知识库 embedding/rerank 使用用户配置的内网模型服务。
9. 在断网 Windows 环境安装并启动。

## 测试报告模板

本次提交的自动化测试覆盖：

- 内网模式默认不在 App 内做域名/IP 白名单阻断
- `safeFetch`、`safeWebSocket` 对用户配置域名透传
- 内网 provider/Web Search/MCP 默认面
- autoUpdater 内网模式 no-op

人工验收需补充：

- Windows 安装包完全断网启动
- 抓包 5 分钟无公网请求
- 企业实际 LLM Gateway/SearXNG/WebDAV/MCP registry 联调

详见 `docs/intranet-test-report.md`。
