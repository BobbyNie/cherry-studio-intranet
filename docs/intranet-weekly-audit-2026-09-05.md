# 2026-09-05 内网 v1 同步审计

## 审计边界与结论

- 工作区开始时干净；原分支 `sync/upstream-v1-weekly-20260820`，HEAD `6de2dd0ffa0bac1de3a6de14ddb1de52aa4aa254`。原提交保持不变。
- 已刷新 origin、upstream main/v1 与 tags。`origin/main` 为 `90141c37ca`，本轮从原 HEAD 创建 `sync/upstream-v1-weekly-20260905`。
- 核对 upstream v1 快照 `c76f529044ffa9c0a6596e2af81f01a374132d8e`；新增 #16245、#17743、#19749 三项。upstream main 为 `79d1685946192df586f500fd660e7096d5dbccc1`，含 v2 开发，未机械合并。
- 结论：经分项适配后引入 MCP 启动失败隔离、旧包参数迁移及当前模型协议兼容；保持内网默认 provider、运行时 allowlist、显式 disable 开关和独立发布策略。
- package version 保持 `1.9.11`；这是部分同步审计完成，不代表完整对齐 v1.9.13。完整分项判断见 `INTRANET_CHANGES.md` 第 15 节。

## 专家审计发现与处理

| 发现 | 修复或决定 |
|---|---|
| #17743 使用 migration 209，撞内网隐私迁移 | 使用新 migration 212，同步 persist version；只换旧包参数，不改命令、企业 registry、凭据、额外参数、isActive |
| migration 212 一条损坏数据会中断整批修复 | 单条检查 null / 非数组 args，仍修复后续有效数据，保留其他配置与幂等性 |
| migration 207 保留自定义 provider 却替换其模型选择 | 根据保留的 provider ID 判断模型，不自动授权其地址；已升级用户过去丢失的选择无法凭空恢复 |
| MCP probe 抛错/cleanup 拒绝中断 Promise.all | 单服务器失败隔离；超时跳过，下一次调用重试，不改会话持久化选择 |
| #19749 只有 UI 参数变化不足以确保 SDK 兼容 | 同步能力识别、推理值与 SDK 协议补丁；锁定 DeepSeek 2.0.57，验证真实出站请求/响应 |
| Azure Anthropic 丢失自定义 fetch | 保留注入 fetch，避免企业自定义请求实现被替换 |
| Ollama 健康检查加载模型 | 改为 /api/show，保留企业路径、headers 与 abort；清理成功/失败/超时的 timer |
| renderer 本地预检查误拦主进程已放行的地址 | 保留 renderer transport，由真实 Electron session guard 校验；使用隔离模块缓存模拟两个进程，验证允许主机、拒绝图片 host、运行时白名单更新 |
| DashScope 所有图片模型被导向 Qwen native API | 仅 Qwen Image 3 改用 native endpoint，其他模型保持原 compatible endpoint |
| Qwen 成功响应无图片被当作成功 | 拒绝空结果；HTTP 失败透传，不继续下载 |
| 同步检查遗漏带 PR 号的等价补丁、把待适配当已引入 | 先检查 patch-equivalent SHA；区分已引入与待审计状态，调整门禁描述 |

## 保留及排除

引入当前模型族（DeepSeek/GLM/Kimi/Qwen/Gemini/Grok 等）的识别、推理档位、旧 xhigh 映射、图片与工具能力分类；这些能力可通过企业部署的 provider 使用，不会启用公共默认 provider。

引入 Anthropic 无 signature 兼容响应、Google/Vertex 工具组合差异、xAI xhigh、Ollama unset/explicit think 语义和 inline reasoning extraction。没有升级 native Claude runtime、没有新增数据库 schema 或 Redux 字段；只扩展现有推理字段的取值。

排除以下具体实现，而非否定其功能目标：

- 全 provider tool-schema 裁剪：会移除合法约束或 $ref 工具，企业网关无统一拒绝契约；保留原工具行为。
- Ollama providerCapabilities 持久化与无界批量探测：触及 state shape 冻结，存在并发、取消和空元数据误判问题。保留原能力设置与名称推断。
- 真实图片生成健康检查：资源消耗大，原实现未取消超时请求/清理 timer；不改变为默认检查路径。
- upstream changeset/release 元数据：内网独立发布。既有 #17754、公网 updater/OAuth 排除继续保留。

## TDD 与测试覆盖

每个实现单元先引入失败测试，再做最小修复；适配中的新增缺陷另走红绿循环。首次全仓通过后，进程边界复查又发现 renderer 预检查不符合主进程白名单架构；新增双进程模块隔离回归测试先得到 6 失败，删除错误的 renderer 预检查后通过。

| 测试范围 | 证据 |
|---|---|
| model classifier / reasoning serializer / ThinkingButton | 初始 84 失败；配套实现后 714 通过（不含已明确排除的 providerCapabilities 测试） |
| 实际 SDK 协议 | DeepSeek image、Google/Vertex、xAI、Anthropic、Ollama 初始 5 失败；补丁与依赖更新后 7 通过 |
| Azure custom fetch | 初始 fetch 未传递，修复后通过 |
| MCP 启动 | 新 helper 基础行为、单项 reject/throw、超时、缺失 server、下次重试、输入不变 |
| 数据迁移 | 207 自定义模型保留、212 registry/env/isActive 保留、损坏条目隔离、幂等、208/209 旧隐私与 provider 回归 |
| Ollama 健康检查 | 自定义 provider、企业 URL 后缀/前缀、headers、signal、拒绝未授权 host、404、成功/失败/超时清理 |
| DashScope | native 参数、企业路径、allowlist、结果图片 host 拒绝、凭据不传给 CDN、其他模型 endpoint 保留、HTTP/空结果失败 |
| 同步边界 | patch-equivalent 编号提交、待适配不计已引入、既有显式排除 |

## 验证结果

环境：Node 24.11.1，pnpm 10.27.0，macOS。命令在本地实际执行。

| 命令 | 结果 |
|---|---|
| pnpm install --lockfile-only --ignore-scripts | 通过；只更新本次 SDK 版本及 patch hashes |
| pnpm install --frozen-lockfile --ignore-scripts | 通过；DeepSeek 锁定 2.0.57，其余保持既有版本 |
| 分组 Vitest 红绿测试 | 已记录上述各单元失败与修复通过，未通过修改期望绕过实际行为 |
| pnpm format | 通过；首次修正本轮文件格式，后续 lint 内的 format 无进一步改动 |
| pnpm lint | 通过（含三端 typecheck、i18n、format）；首次发现测试 fixture 缺少 SDK 必需的 files/mask，补齐后重跑通过 |
| pnpm openapi:check | 通过 |
| pnpm test | 298 文件通过；4787 测试通过、72 原有跳过（4859 总数），最终聚合门禁内耗时 73.31 秒；包含原有内网 guard/defaults、数据恢复、配置同步、streaming projection 与知识库刷新回归 |
| git diff --check | 通过 |

`pnpm build:check` 最终通过，包含重新运行 pnpm lint、pnpm openapi:check、pnpm test。进程边界回归修复后的结果为 298 个测试文件全部通过、4787 项通过、72 项原有跳过；未新增 skip，也未新增 console.log。

## 适用范围与限制

- 单测和 SDK 测试使用可控请求替身验证协议，不等于真实企业 gateway 服务端联调。
- MCP 每个连通性探测有 15 秒窗口；配置读取不受该计时器覆盖。超时不会取消 MCPService 拥有的底层连接，迟到结果仍可能完成。未声称整个启动总耗时封顶。
- 未执行真实 Windows 离线安装、打包后抓包、企业 LLM/WebDAV/MCP 联调；沿用历史报告中的人工验收要求。
- 同步门禁在配置 upstream remote 的本地环境会刷新 v1；本轮已实际核对远端。无 upstream remote 的 CI 不把该门禁作为离线全量同步证明。
- 本轮只创建本地 signoff commit；没有推送、发布或修改用户此前的提交。
