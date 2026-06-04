# Cherry Studio 企业内网版网络审计

本审计基于以下关键词扫描：

`fetch`, `axios`, `got`, `request`, `WebSocket`, `EventSource`, `openExternal`, `shell.openExternal`, `autoUpdater`, `update`, `telemetry`, `analytics`, `sentry`, `posthog`, `feedback`, `cherry-ai.com`, `api.cherry`, `github.com`, `raw.githubusercontent.com`, `npmjs.org`, `registry.npmjs.org`, `registry.npmmirror.com`, `tavily`, `google`, `openai`, `anthropic`, `gemini`, `poe`, `modelscope`, `siliconflow`, `volcengine`, `mcpmarket`, `modelcontextprotocol`, `discord`, `telegram`, `qq`, `producthunt`。

## 统一处理

| 文件路径 | 外联目的 | 请求 URL 或域名 | 是否保留 | 内网版处理方式 |
|---|---|---|---|---|
| `packages/shared/config/intranet.ts` | 内网模式和网络白名单入口 | HTTP(S)/WS(S) URL | 保留 | `CHERRY_INTRANET_MODE=true` 时启用中心 guard；空白名单拒绝全部；白名单只匹配 hostname/IP，不限制协议、端口、路径 |
| `packages/shared/network/networkAllowlist.ts` | hostname/IP 白名单 matcher | host rule / URL input | 保留 | `comp.com` 精确匹配；`*.comp.com` 匹配根域和 DNS 边界子域；完整 URL 保存时只取 hostname |
| `src/main/network/intranetNetworkGuard.ts` | 主进程中心 enforcement | `fetch`, `electron.net.fetch`, session HTTP/HTTPS/WS/WSS | 保留 | 所有 renderer/webview/main-process 请求统一调用 `assertNetworkAllowed()` |
| `src/renderer/src/network/intranetNetworkGuard.ts` | 渲染进程 monkey patch | `window.fetch`, `WebSocket`, `EventSource` | 删除 | 渲染进程不再 monkey patch；统一交给 Electron session/main guard |

## 启动、更新、统计、外链

| 文件路径 | 外联目的 | 请求 URL 或域名 | 是否保留 | 内网版处理方式 |
|---|---|---|---|---|
| `src/main/services/AppUpdater.ts` | 自动更新和更新配置拉取 | GitHub/GitCode/release feed | 保留 | 内网模式不直接 no-op；联网结果由中心白名单决定；仅 `CHERRY_DISABLE_AUTO_UPDATE=true` 时禁用 |
| `src/renderer/src/hooks/useAppInit.ts` | 启动后自动检查更新 | update feed | 保留 | 内网模式不跳过；联网结果由中心白名单决定 |
| `src/main/services/AnalyticsService.ts` | 启动、用量、更新统计 | Cherry Studio analytics endpoint | 保留 | 仅 `CHERRY_DISABLE_TELEMETRY=true` 时不初始化、不发送 |
| `src/preload/index.ts` | 渲染进程打开外部链接 | http/https/mailto/obsidian | 否 | `sanitizeExternalUrl()` 返回 null 时拒绝，错误为“内网版已禁用外部链接” |
| `src/main/services/security.ts` | 主进程外链安全判断 | http/https/mailto/editor deep link | 否 | 外链禁用时 `isSafeExternalUrl()` 直接返回 false |
| `src/main/ipc.ts` | `Open_Website` IPC | 官网、文档、GitHub 等 | 否 | 复用 `isSafeExternalUrl()` 阻断 |
| `src/main/services/AppMenuService.ts` | macOS 帮助菜单外链 | `cherry-ai.com`, docs, GitHub issues/releases | 保留 | 内网模式不直接隐藏；仅 `CHERRY_DISABLE_EXTERNAL_LINKS=true` 时隐藏 |
| `src/main/services/WindowService.ts` | 窗口导航/新窗口外链 | OAuth、官网、任意 http(s) | 部分保留 | 复用 `isSafeExternalUrl()` 处理外部链接；OAuth 公网入口不再默认展示 |
| `src/main/services/WebviewService.ts` | webview 外链 | 任意 http(s) | 部分保留 | 复用主进程外链安全判断 |
| `src/renderer/src/pages/settings/AboutSettings.tsx` | 关于页、更新、反馈、官网、文档 | Cherry 官网、GitHub、mailto | 保留 | 内网模式不直接隐藏；外链和更新分别由显式 disable 开关控制 |

## 模型服务

| 文件路径 | 外联目的 | 请求 URL 或域名 | 是否保留 | 内网版处理方式 |
|---|---|---|---|---|
| `src/renderer/src/config/providers.ts` | 系统 provider 默认配置 | OpenAI、Anthropic、Gemini、ModelScope、SiliconFlow、Volcengine 等 | 部分保留 | 内网模式只展示 `intranet`, `new-api`, `ollama`, `lmstudio`, `ovms`, `gpustack` |
| `src/renderer/src/config/models/default.ts` | 默认模型列表 | 预置模型元数据 | 保留 | 新增 `qwen-coder`, `deepseek-coder`, `glm-coder`, `embedding-model`, `rerank-model` |
| `src/renderer/src/store/llm.ts` | LLM 初始 state | 系统 provider 列表 | 保留 | 通过 `SYSTEM_PROVIDERS` 和 `SYSTEM_MODELS.defaultModel` 切到内网默认 |
| `src/renderer/src/pages/settings/ProviderSettings/ProviderList.tsx` | 设置页 provider 列表 | 系统 provider UI | 部分保留 | 内网模式隐藏公网系统 provider，保留自定义 provider |
| `src/renderer/src/aiCore/services/listModels.ts` | 拉取模型列表 | `/models`, GitHub catalog, OpenRouter, Gemini, Vertex 等 | 保留 | renderer 不再预先检查白名单；请求由中心 guard 决定 |
| `src/main/aiCore/provider/providerConfig.ts` | 主进程 provider host 格式化 | provider `apiHost` | 保留 | 保留 provider 抽象和用户配置的 API host |
| `src/main/services/OpenClawService.ts` | 网关健康检查和 provider 同步 | `127.0.0.1`, provider host, Google/Anthropic/OpenAI 兼容地址 | 部分保留 | 本地健康检查保留；内网版默认 provider 配置避免主动使用公网 provider |

## Web Search

| 文件路径 | 外联目的 | 请求 URL 或域名 | 是否保留 | 内网版处理方式 |
|---|---|---|---|---|
| `src/renderer/src/config/webSearchProviders.ts` | Web Search provider 默认配置 | Tavily、Exa、Bocha、Google、Bing、Baidu、Zhipu | 保留 | 内网模式保留 upstream provider 列表；请求由中心 guard 决定 |
| `src/renderer/src/store/websearch.ts` | Web Search 初始 state | provider 列表 | 保留 | 默认 provider 保持 upstream `local-bing` |
| `src/renderer/src/providers/WebSearchProvider/WebSearchProviderFactory.ts` | Web Search provider 创建 | 各搜索 provider | 保留 | 内网模式不再限制为 SearXNG |
| `src/renderer/src/providers/WebSearchProvider/SearxngProvider.ts` | SearXNG 配置和搜索 | `/config`, search endpoint | 保留 | renderer 不再预先检查白名单；请求由中心 guard 决定 |

## MCP

| 文件路径 | 外联目的 | 请求 URL 或域名 | 是否保留 | 内网版处理方式 |
|---|---|---|---|---|
| `src/renderer/src/store/mcp.ts` | 内置 MCP server 列表 | `@mcpmarket/mcp-auto-install`, modelcontextprotocol GitHub references | 保留 | 内网模式不直接裁剪；仅 `CHERRY_DISABLE_MARKETPLACE=true` 时隐藏公网 marketplace 型入口 |
| `src/main/services/MCPService.ts` | MCP SSE/HTTP/stdio/npx/uvx 启动 | MCP baseUrl、npm/pip registry | 保留 | `registryUrl` 走中心白名单；仅 marketplace 显式禁用时限制默认公网包仓库 |
| `src/renderer/src/pages/settings/MCPSettings/index.tsx` | MCP Marketplace、provider 同步、npx 搜索入口 | ModelScope、302AI、Bailian、MCPRouter、TokenFlux、LanYun | 保留 | 内网模式不直接隐藏；请求由中心 guard 决定 |
| `src/renderer/src/pages/settings/MCPSettings/McpSettings.tsx` | MCP registry 选择 | npmmirror、各公网 PyPI 镜像 | 保留 | 内网模式不直接隐藏默认 registry；请求由中心 guard 决定 |
| `src/renderer/src/pages/settings/MCPSettings/providers/*.ts` | 从公网服务商同步 MCP | ModelScope、302AI、Bailian、TokenFlux、LanYun、MCPRouter | 保留 | UI 入口保留；请求由中心 guard 决定 |

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
| `src/main/services/NutstoreService.ts` | WebDAV/坚果云备份 | 用户配置 WebDAV URL | 部分保留 | 保留配置入口；完全离线版默认不自动放行任意 WebDAV URL，启用前需在企业部署验收中确认其网络策略 |
| `src/renderer/src/pages/settings/DataSettings/WebDavSettings.tsx` | WebDAV 设置 | 用户输入 URL | 保留 | 管理员需配置内网 WebDAV 或文件服务器 |
| `src/main/services/CodeToolsService.ts` | CLI 版本检查/安装 | `registry.npmjs.org`, `registry.npmmirror.com` | 否 | MCP UI 隐藏依赖在线安装入口；需要时由管理员配置企业镜像 |
| `scripts/download-rtk-binaries.js` | 构建期下载 RTK | GitHub releases | 否 | 内网构建需预置资源或使用内网镜像，不在应用运行时执行 |

## 仍需人工验收

1. 使用抓包工具启动 5 分钟，确认无公网 DNS/HTTP/HTTPS。
2. 在完全断网 Windows 环境启动安装包。
3. 管理员配置内网 OpenAI-compatible 模型 Provider 后，验证对应 API endpoint 被放行且未配置目标被阻断。
4. 如启用 SearXNG、WebDAV、MCP registry，需单独验收其内网地址不会触发公网访问或被离线网络策略误放行。
