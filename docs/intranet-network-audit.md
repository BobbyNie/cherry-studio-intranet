# Cherry Studio 企业内网版网络审计

## 当前策略

`CHERRY_INTRANET_MODE=true` 时，应用只执行一条网络规则：HTTP/HTTPS/WS/WSS 目标必须命中运行时配置 `intranetNetworkAllowlist`。白名单为空时拒绝全部。

白名单匹配的是 hostname/IP：

- `comp.com` 精确匹配 `comp.com`
- `*.comp.com` 匹配 `comp.com` 和任意 DNS 边界子域
- 支持精确 IP literal，不内置 localhost 或私网段例外，不支持 CIDR
- 输入完整 URL 时保存为 hostname
- 命中 hostname 后不限制协议、端口或路径

## Enforcement

| 位置 | 覆盖范围 | 说明 |
|---|---|---|
| `packages/shared/config/intranet.ts` | 共享 matcher 和 `assertNetworkAllowed()` | 所有白名单规则统一归一化和匹配 |
| `src/main/network/intranetNetworkGuard.ts` | `session.webRequest`、`globalThis.fetch`、`electron.net.fetch` | 覆盖 renderer/webview 请求和主进程 fetch |
| `src/main/services/NetworkAllowlistConfigService.ts` | `intranetNetworkAllowlist` / `CHERRY_NETWORK_ALLOWLIST` | env 仅首次种子化，用户保存空表后不回填 |
| `resources/scripts/download.js` | installer 下载和重定向 | `uv`、`bun`、`openclaw`、`ovms` 无本地包时下载前先检查白名单 |

## 已移除的旧路径

- Provider endpoint allowlist 自动同步
- renderer `fetch` / `WebSocket` / `EventSource` monkey patch
- `safeRequest` / `safeFetch` / `safeWebSocket` wrapper
- 内网模式下直接禁用 MCP、OAuth、Backup、Knowledge、WebSearch、Updater、OpenClaw 的网络控制

## 功能面恢复原则

MCP、OAuth、WebDAV/S3/Nutstore、Knowledge URL/Sitemap、WebSearch、OpenClaw、Updater 和外部链接保持上游行为。它们是否能实际连通，只由中心白名单 guard 决定。

## 本地资源

启动或运行期会加载的公共资源已改为本地打包资源：

- `resources/cherry-studio/*.html` 不再加载 Tailwind/Vue/markdown-it CDN
- skill-creator viewer/report 不再加载 Google Fonts，SheetJS 使用本地 vendored 文件
- Pyodide worker 使用 `src/renderer/public/pyodide/v0.28.0/full/`
- installer scripts 先使用 `resources/binaries/<platform-arch>/` 本地包

## 人工验收

1. 保存空白名单后，确认模型、WebSearch、MCP、备份、更新等 HTTP/HTTPS/WS/WSS 目标全部被阻断。
2. 添加企业域名或 IP 后，确认对应服务可访问且非白名单公网目标仍被阻断。
3. 在打包产物中验证 `src/renderer/public/pyodide/v0.28.0/full/` 被正确复制。
4. 在 Windows 内网环境验证本地 installer 包优先路径；缺少本地包时，未加入白名单的下载 URL 应失败。
