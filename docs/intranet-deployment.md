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
CHERRY_DISABLE_PUBLIC_NETWORK=true
CHERRY_DISABLE_AUTO_UPDATE=true
CHERRY_DISABLE_TELEMETRY=true
CHERRY_DISABLE_MARKETPLACE=true
CHERRY_DISABLE_EXTERNAL_LINKS=true
CHERRY_NETWORK_ALLOWLIST=llm-gateway.intranet.local,searxng.intranet.local,npm-registry.intranet.local:4873
```

默认 allowlist 总是包含：

- `localhost`
- `127.0.0.1`
- `::1`
- `10.0.0.0/8`
- `172.16.0.0/12`
- `192.168.0.0/16`

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
- 如需 npx/uvx/bunx，必须配置 allowlist 内企业包仓库，例如 `http://npm-registry.intranet.local:4873`

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

- 手动触发 `Intranet Release`，输入 release tag，例如 `intranet-v1.9.4`
- 推送 tag：`v*` 或 `intranet-v*`

构建矩阵：

- `macos-latest`：生成 macOS `dmg` 和 `zip`，包含 `arm64` / `x64`
- `windows-latest`：生成 Windows `setup.exe` 和 `portable.exe`，包含 `x64` / `arm64`

发布行为：

- 构建任务先上传 Actions artifact
- `publish-intranet-release` 统一下载全部 artifact
- 自动创建或更新 GitHub Release
- Release 中包含 `SHA256SUMS.txt`

可选签名 secret：

- `CSC_LINK`
- `CSC_KEY_PASSWORD`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`

如果未配置签名 secret，workflow 仍会按 `CSC_IDENTITY_AUTO_DISCOVERY=false` 尝试生成未签名构建产物，适合内网验收和二次签名流程。

## 验收步骤

1. 启动应用，确认未配置模型时应用不崩溃，并提示配置内网模型。
2. 使用抓包工具观察 5 分钟，除 allowlist 内服务外不得出现公网 DNS/HTTP/HTTPS。
3. 配置 `http://127.0.0.1:8000/v1` 或企业 LLM Gateway 后验证聊天、流式输出、多轮上下文。
4. 配置 `https://api.openai.com/v1`，确认被阻断并显示“内网版已阻止公网访问”。
5. 验证 Web Search 只显示内网 SearXNG。
6. 验证 MCP Marketplace、自动安装、npx 搜索入口不可见。
7. 验证点击关于页外链不会打开浏览器。
8. 验证知识库 embedding/rerank 使用 allowlist 内模型服务。
9. 在断网 Windows 环境安装并启动。

## 测试报告模板

本次提交的自动化测试覆盖：

- allowlist 默认私网放行和公网阻断
- safeFetch/safeWebSocket 阻断
- 内网 provider/Web Search/MCP 默认面
- autoUpdater 内网模式 no-op

人工验收需补充：

- Windows 安装包完全断网启动
- 抓包 5 分钟无公网请求
- 企业实际 LLM Gateway/SearXNG/WebDAV/MCP registry 联调

详见 `docs/intranet-test-report.md`。
