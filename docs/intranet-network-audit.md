# Cherry Studio 企业内网版网络审计

本审计基于以下关键词扫描：

`fetch`, `axios`, `got`, `request`, `WebSocket`, `EventSource`, `openExternal`, `shell.openExternal`, `autoUpdater`, `update`, `telemetry`, `analytics`, `sentry`, `posthog`, `feedback`, `cherry-ai.com`, `api.cherry`, `github.com`, `raw.githubusercontent.com`, `npmjs.org`, `registry.npmjs.org`, `registry.npmmirror.com`, `tavily`, `google`, `openai`, `anthropic`, `gemini`, `poe`, `modelscope`, `siliconflow`, `volcengine`, `mcpmarket`, `modelcontextprotocol`, `discord`, `telegram`, `qq`, `producthunt`。

## 统一处理

| 文件路径 | 外联目的 | 请求 URL 或域名 | 是否保留 | 内网版处理方式 |
|---|---|---|---|---|
| `packages/shared/config/intranet.ts` | 内网模式和历史 allowlist 兼容 | `CHERRY_NETWORK_ALLOWLIST` | 保留 | `assertNetworkAllowed()` 作为兼容 seam 保留，但默认不做域名/IP 阻断，公网不可达交给企业网络边界 |
| `packages/shared/network/safeRequest.ts` | 统一安全请求入口 | 任意业务 URL | 保留 | 继续作为统一请求入口，内网版不再执行 App 级 host allowlist 阻断 |
| `src/main/network/intranetNetworkGuard.ts` | 主进程运行时兼容兜底 | `fetch`, `electron.net.fetch`, session HTTP/HTTPS/WS/WSS | 保留 | 兼容原 guard 安装流程，但底层 `assertNetworkAllowed()` 不再取消请求 |
| `src/renderer/src/network/intranetNetworkGuard.ts` | 渲染进程运行时兜底 | `window.fetch`, `WebSocket`, `EventSource` | 保留 | 内网模式下 monkey patch 浏览器网络 API |

## 启动、更新、统计、外链

| 文件路径 | 外联目的 | 请求 URL 或域名 | 是否保留 | 内网版处理方式 |
|---|---|---|---|---|
| `src/main/services/AppUpdater.ts` | 自动更新和更新配置拉取 | GitHub/GitCode/release feed | 否 | `CHERRY_DISABLE_AUTO_UPDATE=true` 时构造器、检查更新、安装更新均 no-op |
| `src/renderer/src/hooks/useAppInit.ts` | 启动后自动检查更新 | update feed | 否 | 内网模式跳过初始和定时更新检查 |
| `src/main/services/AnalyticsService.ts` | 启动、用量、更新统计 | Cherry Studio analytics endpoint | 否 | `CHERRY_DISABLE_TELEMETRY=true` 或内网模式下不初始化、不发送 |
| `src/preload/index.ts` | 渲染进程打开外部链接 | http/https/mailto/obsidian | 否 | `sanitizeExternalUrl()` 返回 null 时拒绝，错误为“内网版已禁用外部链接” |
| `src/main/services/security.ts` | 主进程外链安全判断 | http/https/mailto/editor deep link | 否 | 外链禁用时 `isSafeExternalUrl()` 直接返回 false |
| `src/main/ipc.ts` | `Open_Website` IPC | 官网、文档、GitHub 等 | 否 | 复用 `isSafeExternalUrl()` 阻断 |
| `src/main/services/AppMenuService.ts` | macOS 帮助菜单外链 | `cherry-ai.com`, docs, GitHub issues/releases | 否 | 内网模式显示禁用提示，不渲染外链菜单项 |
| `src/main/services/WindowService.ts` | 窗口导航/新窗口外链 | OAuth、官网、任意 http(s) | 部分保留 | 复用 `isSafeExternalUrl()` 处理外部链接；OAuth 公网入口不再默认展示 |
| `src/main/services/WebviewService.ts` | webview 外链 | 任意 http(s) | 部分保留 | 复用主进程外链安全判断 |
| `src/renderer/src/pages/settings/AboutSettings.tsx` | 关于页、更新、反馈、官网、文档 | Cherry 官网、GitHub、mailto | 否 | 内网模式隐藏更新和外链区，显示企业内网版审计说明 |

## 模型服务

| 文件路径 | 外联目的 | 请求 URL 或域名 | 是否保留 | 内网版处理方式 |
|---|---|---|---|---|
| `src/renderer/src/config/providers.ts` | 系统 provider 默认配置 | OpenAI、Anthropic、Gemini、ModelScope、SiliconFlow、Volcengine 等 | 部分保留 | 内网模式只展示 `intranet`, `new-api`, `ollama`, `lmstudio`, `ovms`, `gpustack` |
| `src/renderer/src/config/models/default.ts` | 默认模型列表 | 预置模型元数据 | 保留 | 新增 `qwen-coder`, `deepseek-coder`, `glm-coder`, `embedding-model`, `rerank-model` |
| `src/renderer/src/store/llm.ts` | LLM 初始 state | 系统 provider 列表 | 保留 | 通过 `SYSTEM_PROVIDERS` 和 `SYSTEM_MODELS.defaultModel` 切到内网默认 |
| `src/renderer/src/pages/settings/ProviderSettings/ProviderList.tsx` | 设置页 provider 列表 | 系统 provider UI | 部分保留 | 内网模式隐藏公网系统 provider，保留自定义 provider |
| `src/renderer/src/aiCore/services/listModels.ts` | 拉取模型列表 | `/models`, GitHub catalog, OpenRouter, Gemini, Vertex 等 | 部分保留 | 内网版默认隐藏公网 provider；用户显式配置的模型 API 不再由 App 级 allowlist 阻断 |
| `src/main/aiCore/provider/providerConfig.ts` | 主进程 provider host 格式化 | provider `apiHost` | 保留 | 保留 provider 抽象和用户配置的 API host |
| `src/main/services/OpenClawService.ts` | 网关健康检查和 provider 同步 | `127.0.0.1`, provider host, Google/Anthropic/OpenAI 兼容地址 | 部分保留 | 本地健康检查保留；内网版默认 provider 配置避免主动使用公网 provider |

## Web Search

| 文件路径 | 外联目的 | 请求 URL 或域名 | 是否保留 | 内网版处理方式 |
|---|---|---|---|---|
| `src/renderer/src/config/webSearchProviders.ts` | Web Search provider 默认配置 | Tavily、Exa、Bocha、Google、Bing、Baidu、Zhipu | 否 | 内网模式只保留 `内网 SearXNG`，默认 `http://searxng.intranet.local` |
| `src/renderer/src/store/websearch.ts` | Web Search 初始 state | provider 列表 | 保留 | 内网模式默认 provider 改为 `searxng` |
| `src/renderer/src/providers/WebSearchProvider/WebSearchProviderFactory.ts` | Web Search provider 创建 | 各搜索 provider | 部分保留 | 内网模式非 SearXNG 直接抛出“联网搜索仅支持内网 SearXNG。” |
| `src/renderer/src/providers/WebSearchProvider/SearxngProvider.ts` | SearXNG 配置和搜索 | `/config`, search endpoint | 保留 | 仅保留内网 SearXNG 产品入口；baseURL 不再由 App 级 allowlist 阻断 |

## MCP

| 文件路径 | 外联目的 | 请求 URL 或域名 | 是否保留 | 内网版处理方式 |
|---|---|---|---|---|
| `src/renderer/src/store/mcp.ts` | 内置 MCP server 列表 | `@mcpmarket/mcp-auto-install`, modelcontextprotocol GitHub references | 部分保留 | 内网模式移除自动安装和公网型内置项；fetch/browser 默认 inactive |
| `src/main/services/MCPService.ts` | MCP SSE/HTTP/stdio/npx/uvx 启动 | MCP baseUrl、npm/pip registry | 部分保留 | 保留手动 MCP；Marketplace/自动安装默认禁用，企业 registry 由管理员配置 |
| `src/renderer/src/pages/settings/MCPSettings/index.tsx` | MCP Marketplace、provider 同步、npx 搜索入口 | ModelScope、302AI、Bailian、MCPRouter、TokenFlux、LanYun | 否 | 内网模式隐藏 Marketplace、provider 同步、npx 搜索和依赖安装入口 |
| `src/renderer/src/pages/settings/MCPSettings/McpSettings.tsx` | MCP registry 选择 | npmmirror、各公网 PyPI 镜像 | 部分保留 | 内网模式只展示企业内网 NPM/PyPI 示例和自定义 registry |
| `src/renderer/src/pages/settings/MCPSettings/providers/*.ts` | 从公网服务商同步 MCP | ModelScope、302AI、Bailian、TokenFlux、LanYun、MCPRouter | 否 | UI 入口隐藏，默认不触发公网服务商同步 |

## 知识库、文件、向量与重排

| 文件路径 | 外联目的 | 请求 URL 或域名 | 是否保留 | 内网版处理方式 |
|---|---|---|---|---|
| `src/main/knowledge/embedjs/embeddings/EmbeddingsFactory.ts` | embedding API | OpenAI-compatible、Ollama、VoyageAI | 部分保留 | 默认模型指向内网 provider；用户显式配置的 embedding 地址透传 |
| `src/main/knowledge/reranker/GeneralReranker.ts` | rerank API | provider `baseURL` | 保留 | 默认使用内网 rerank 配置；用户显式配置地址透传 |
| `src/main/knowledge/preprocess/*Provider.ts` | 文档预处理 OCR/解析 | Mistral、MinerU、Doc2x、OpenMineru、PaddleOCR 等 | 部分保留 | 部署文档要求改为本地资源或内网镜像，默认不启用公网预处理服务 |
| `src/main/knowledge/embedjs/loader/*` | 本地文档解析 | 本地文件 | 保留 | 本地解析和临时文件保留，不上传用户文档 |

## 数据同步、备份和工具下载

| 文件路径 | 外联目的 | 请求 URL 或域名 | 是否保留 | 内网版处理方式 |
|---|---|---|---|---|
| `src/main/services/NutstoreService.ts` | WebDAV/坚果云备份 | 用户配置 WebDAV URL | 部分保留 | 保留用户配置的内网 WebDAV/文件服务器备份，不再做 App 级 host allowlist 阻断 |
| `src/renderer/src/pages/settings/DataSettings/WebDavSettings.tsx` | WebDAV 设置 | 用户输入 URL | 保留 | 管理员需配置内网 WebDAV 或文件服务器 |
| `src/main/services/CodeToolsService.ts` | CLI 版本检查/安装 | `registry.npmjs.org`, `registry.npmmirror.com` | 否 | MCP UI 隐藏依赖在线安装入口；需要时由管理员配置企业镜像 |
| `scripts/download-rtk-binaries.js` | 构建期下载 RTK | GitHub releases | 否 | 内网构建需预置资源或使用内网镜像，不在应用运行时执行 |

## 仍需人工验收

1. 使用抓包工具启动 5 分钟，确认无公网 DNS/HTTP/HTTPS。
2. 在完全断网 Windows 环境启动安装包。
3. 管理员配置内网 OpenAI-compatible、SearXNG、WebDAV、MCP registry 后验证默认路径不会主动访问官方公网服务。
