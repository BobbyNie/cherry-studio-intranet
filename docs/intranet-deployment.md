# 企业完全离线版部署说明

## 构建环境

要求：

- Node.js `>=24.11.1`
- pnpm `10.27.0`
- 已经在离线制品库或本机 pnpm store 中缓存依赖
- Windows 打包需在可构建 Windows artifact 的环境执行 Electron Builder

## 环境变量

复制 `.env.offline.example` 为 `.env.offline`（或沿用 `.env.intranet.example` / `.env.intranet` 兼容命名）：

```bash
CHERRY_OFFLINE_MODE=true
CHERRY_INTRANET_MODE=true
CHERRY_DISABLE_PUBLIC_NETWORK=true
CHERRY_DISABLE_AUTO_UPDATE=true
CHERRY_DISABLE_TELEMETRY=true
CHERRY_DISABLE_MARKETPLACE=true
CHERRY_DISABLE_EXTERNAL_LINKS=true
CHERRY_LOCAL_MODEL_ALLOWED_PORTS=
```

**完全离线版在应用内强制执行 Offline Network Guard：**

- 默认 deny all，包括 localhost
- 仅当用户在「设置 → 完全离线版」中显式启用本机模型服务，并配置 API Base URL 与允许端口后，才允许访问 `localhost` / `127.0.0.1` / `::1` 的指定端口
- 不允许企业内网网关、局域网、公网域名或代理

## 默认本机模型服务

模型服务：

- 名称：`本机模型服务`
- 类型：OpenAI-compatible
- 默认 `apiHost`：空（必须用户配置）
- 默认 `enabled`：false
- 默认模型：无（必须用户导入或手动添加）

可选保留 Ollama provider，但同样默认 disabled，且必须经 Offline Network Guard 放行。

Web Search：

- 完全离线版默认禁用，设置入口隐藏

MCP：

- 保留手动 MCP Server 配置（stdio / 经 Guard 放行的 localhost HTTP）
- Marketplace、自动安装、远程 npx 搜索默认禁用

备份：

- 默认仅保留本地文件备份
- WebDAV、S3、Nutstore 等网络备份入口在离线模式下隐藏

## 构建命令

```bash
corepack pnpm install --offline
corepack pnpm build:offline
corepack pnpm package:mac:offline
corepack pnpm package:win:offline
```

兼容命令（语义等同，仍加载内网/离线 env）：

```bash
corepack pnpm build:intranet
corepack pnpm package:mac:intranet
corepack pnpm package:win:intranet
```

`build:offline` / `package:*:offline` 会先加载 `.env.offline.example`，再加载可选 `.env.offline` 覆盖。

如果内网没有完整 pnpm store，请先在联网构建机执行依赖缓存同步，再把 pnpm store 和项目 lockfile 带入离线环境。

## 验收步骤

1. 启动应用，未配置本机模型时对话页应显示清晰引导，而不是崩溃或长时间 loading。
2. 使用抓包工具观察 5 分钟，确认启动、设置、聊天等默认路径不会主动访问公网、企业内网或 localhost。
3. 在「设置 → 完全离线版」启用本机模型服务，配置 `http://127.0.0.1:11434/v1`（或 LM Studio / llama.cpp 等本机服务）及允许端口。
4. 验证仅配置的 localhost 端口可访问，公网/内网/域名请求均被拦截。
5. 验证 Web Search、MCP Marketplace、网络备份、代理设置入口不可见或不可用。
6. 验证检查更新仅显示离线分发说明，不请求任何 release URL。
7. 验证点击外链不会打开浏览器。
8. 在完全断网环境安装并启动。

## 测试报告模板

自动化测试覆盖：

- Offline Network Guard 默认 deny all
- localhost 显式启用 + 端口白名单才放行
- 本机模型 provider 默认空 apiHost
- migration 210 清理旧 gateway 配置
- 对话页未配置空状态

人工验收需补充：

- 完全断网 Windows/macOS 安装包启动
- 抓包 5 分钟无意外外联
- 本机 Ollama / LM Studio 联调
