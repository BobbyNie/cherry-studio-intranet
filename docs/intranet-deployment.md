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
CHERRY_NETWORK_ALLOWLIST=
```

`CHERRY_NETWORK_ALLOWLIST` 仅用于首次启动时种子化运行时配置 `intranetNetworkAllowlist`。如果用户在 Settings -> General 保存过白名单，即使保存为空表，也不会再被环境变量覆盖。

**企业内网版网络策略**（`CHERRY_INTRANET_MODE=true`）：

- 默认 **deny-all**：白名单为空时，拦截一切 HTTP/HTTPS/WS/WSS 目标。
- 白名单只匹配 hostname/IP，不限制协议、端口和路径。
- `comp.com` 精确匹配 `comp.com`。
- `*.comp.com` 匹配 `comp.com` 和任意 DNS 边界子域，例如 `aaa.bbb.comp.com`，不匹配 `evilcomp.com`。
- 支持精确 IP literal，例如 `127.0.0.1`、`10.1.2.3`；不内置 localhost/私网段例外，不支持 CIDR。
- 输入完整 URL 时仅保存 hostname。
- 所有业务能力是否能联网，只由统一白名单 guard 判断；MCP、OAuth、备份、知识库、WebSearch、更新等功能本身不再因为 intranet mode 被直接禁用。

## 默认内网服务

模型服务：

- 名称：`企业内网模型服务`
- 类型：OpenAI-compatible
- 默认地址：`http://llm-gateway.intranet.local/v1`
- 默认模型：`qwen-coder`, `deepseek-coder`, `glm-coder`, `embedding-model`, `rerank-model`

Web Search：

- 保留上游 provider 行为。
- 可配置企业内网 SearXNG 或其他搜索服务；未命中白名单的目标会被统一 guard 阻断。

MCP：

- 保留手动 MCP Server 配置
- 自动安装、Marketplace、远端 MCP transport 不再因 intranet mode 直接禁用
- 如需 npx/uvx/bunx，建议配置企业包仓库，例如 `http://npm-registry.intranet.local:4873`，并把 registry hostname 加入白名单

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
2. 使用抓包工具观察 5 分钟，确认未加入白名单的 HTTP/HTTPS/WS/WSS 目标被阻断。
3. 保存空白名单，确认模型、WebSearch、MCP、备份等网络目标全部被阻断。
4. 配置 `127.0.0.1`、企业 LLM Gateway 或 `*.comp.com` 后验证聊天、流式输出、多轮上下文。
5. 配置企业内网 SearXNG/WebDAV/MCP registry，确认命中白名单即可访问。
6. 验证非白名单公网 URL 仍由中心 guard 阻断。
7. 验证知识库 embedding/rerank 使用用户配置的内网模型服务。
8. 在断网 Windows 环境安装并启动。

## 测试报告模板

本次提交的自动化测试覆盖：

- 内网模式默认 deny-all，空白名单拒绝全部 HTTP/HTTPS/WS/WSS。
- hostname/IP 白名单 matcher 覆盖精确域名、DNS 边界通配符、IP literal、URL 输入归一化。
- 主进程 `session.webRequest`、`globalThis.fetch`、`electron.net.fetch` 共用同一白名单结果。
- Settings -> General 读写 `intranetNetworkAllowlist`，`CHERRY_NETWORK_ALLOWLIST` 仅首次种子化。
- MCP/OAuth/备份/知识库/WebSearch/Updater 不再因 intranet mode 直接禁用，连接由中心 guard 判断。
- 启动/运行期公共 JS/CSS/wasm 资源使用本地打包资产。

人工验收需补充：

- Windows 安装包完全断网启动
- 抓包 5 分钟无公网请求
- 企业实际 LLM Gateway/SearXNG/WebDAV/MCP registry 联调

详见 `docs/intranet-test-report.md`。
