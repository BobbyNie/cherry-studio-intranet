# 内网版本修改总结

> 最后更新: 2026-06-15
> 用于跟踪内网版本相对于上游的修改，便于后续同步决策

---

## 1. 模型列表过滤优化 ⭐ 可同步到上游

**文件**: `src/renderer/src/pages/settings/ProviderSettings/ModelList/ManageModelsPopup.tsx`

**问题**: 预定义的 `SYSTEM_MODELS` 可能包含 provider API 实际不支持的模型

**修改**:
```typescript
const filteredSystemModels =
  !loadingModels && listModels.length > 0
    ? systemModels.filter((sm) => listModels.some((lm) => lm.id === sm.id))
    : systemModels
```

**同步建议**: 有价值的通用改进

---

## 2. CherryAI Provider → Intranet Provider ❌ 内网专用

内网版本不使用 CherryAI，全部替换为 `SYSTEM_PROVIDERS_CONFIG.intranet`

**修改文件**:
| 文件 | 修改内容 |
|------|----------|
| `src/renderer/src/hooks/useProvider.ts` | fallback 改用 intranet |
| `src/renderer/src/hooks/useStore.ts` | getStoreProviders 使用 intranet |
| `src/renderer/src/services/ErrorDiagnosisService.ts` | getIntranetFreeModel 替换 getCherryAiFreeModel |
| `src/renderer/src/config/providers.ts` | 移除 qwenModel 导入 |
| `src/renderer/src/config/models/default.ts` | defaultModels 始终用 intranetModels |
| `src/renderer/src/store/migrate.ts` | 迁移使用 intranetModels[0] |
| `src/renderer/src/services/__tests__/ErrorDiagnosisService.test.ts` | 测试 mock 更新 |

**同步建议**: 内网专用，不应同步

---

## 3. React Hooks 依赖修复 ⭐ 可同步到上游

**文件**: `src/renderer/src/pages/settings/ProviderSettings/ModelList/ManageModelsPopup.tsx:184`

**修改**: 移除 `onAddAll` useCallback 中不必要的 `models` 依赖

**同步建议**: 代码质量改进

---

## 4. 工程技能配置 ⚠️ 需团队确认

**新增文件**:
- `docs/agents/issue-tracker.md` - GitHub Issue tracker 配置
- `docs/agents/triage-labels.md` - Triage 标签映射
- `docs/agents/domain.md` - 单上下文文档布局

**修改文件**:
- `CLAUDE.md` - 添加 `## Agent skills` 章节

**同步建议**: 需要上游团队确认工作流

---

## 5. 上游同步记录 (2026-05-23)

从 `CherryHQ/cherry-studio` `main` 合并了 v1.9.6 之后的 4 个修复提交：

| 提交 | 说明 | 内网适用 |
|------|------|----------|
| #15185 | agents: 向 Claude Code 传递自定义 headers | ✅ |
| #15188 | 从包内本地可执行文件启动 opencode | ✅ |
| #15204 | Gemini 3.x UI 与采样参数 hotfix | ✅ |
| #15201 | gitignore: 忽略 Antigravity CLI 本地文件 | ✅ |

内网专用排除逻辑未受影响（`packages/shared/config/intranet.ts`、MCP 公网限制、自动更新禁用等保持不变）。

## 6. 上游同步记录 (2026-05-25)

从 `CherryHQ/cherry-studio` `main` cherry-pick 了 v1.9.6 之后的 5 个修复提交：

| PR | 说明 | 内网适用 | 备注 |
|----|------|----------|------|
| #15233 | InputbarCore SendMessageButton 补 key | ✅ | |
| #15283 | AIHubMix reasoning effort provider ID | ✅ | |
| #15277 | StepFun Anthropic 兼容 provider | ✅ | 迁移编号改为 `208`（`207` 保留给内网 provider 清理） |
| #15256 | grok-build-0.1 模型能力识别 | ✅ | |
| #15288 | Qwen max 系列排除 vision 误判 | ✅ | |

内网专用排除逻辑未受影响。同步检测见 `scripts/__tests__/upstream-sync.test.ts`（按 PR 编号匹配，允许内网迁移编号差异）。

## 7. 上游同步记录 (2026-06-01)

从 `CherryHQ/cherry-studio` 标签 `v1.9.8` cherry-pick / 合并了 v1.9.6 之后尚未同步的修复，版本升至 **1.9.8**。

| PR / 变更 | 说明 | 内网适用 | 备注 |
|-----------|------|----------|------|
| #15318 | 分析遥测尊重 enableDataCollection | ✅ | `ConfigManager` 保留 `isTelemetryDisabled()` |
| #14329 | 非 Gemini 提供商不误判原生 PDF | ✅ | |
| #15331 | ExaMCP 联网搜索字段对齐 | ✅ | 含单测 |
| #15352 | CherryIN DeepSeek 1m 后缀 | ✅ | 不影响内网 provider |
| #15349 | 笔记工具栏滚动固定 | ✅ | |
| #15303 | Gemini 安全设置 BLOCK_NONE | ✅ | |
| #15146 | 刷新缓存的小程序 URL | ✅ | |
| #15446 | CI v1 分支触发器 | ✅ | |
| — | OpenClaw dashboard token 使用 fragment | ✅ | |
| — | 工具调用 UI 与折叠行为 | ✅ | |
| — | 隐私政策与数据采集设置 | ⚠️ | 内网跳过 `PrivacyPolicyUpdateNotice`；不强制开启采集 |
| #15324 | GitCode 同步 CI | ❌ | 内网发布流程不需要 |
| #15362 | upstream v1.9.7 release chore | ❌ | 由内网自行 bump 版本 |

`scripts/__tests__/upstream-sync.test.ts` 改为对照 `v1.9.8` 标签（不再对照 `upstream/main` 的 v2 线）。

## 8. 上游同步记录 (2026-06-08)

从 `CherryHQ/cherry-studio` 标签 `v1.9.11` cherry-pick 了 v1.9.8 之后尚未同步的修复，版本升至 **1.9.11**。

| PR / 变更 | 说明 | 内网适用 | 备注 |
|-----------|------|----------|------|
| revert #15146 | 回滚小程序 URL 缓存刷新 | ✅ | |
| — | 清理 analytics 测试无用 mock | ✅ | |
| #15538 | OV OCR CPU 检测防护 | ✅ | |
| #15533 | Agent 会话尊重话题命名设置 | ✅ | |
| #15543 | MiniMax M3 模型注册 | ✅ | |
| — | 隐私政策文案更新 | ✅ | 内网仍跳过 `PrivacyPolicyUpdateNotice` |
| — | 初始 LLM 状态排除 ceplalon/tokenflux | ✅ | 与内网 `SYSTEM_PROVIDERS` 过滤合并 |
| #15580 | 精简 legacy MiniMax 模型 | ✅ | |
| #15575 | Gemini 模型列表 API Key 编码 | ✅ | |
| #15577 | 自定义 Provider 模型分组推断 | ✅ | 保留内网 allowlist 单测 |
| #15531 | 删除 Agent 会话时清理消息 | ✅ | 含单测 |
| #15389 | Gemini 小程序 Electron UA 字号修复 | ✅ | |
| #15513 | MiniMax M3 思考过程支持 | ✅ | |
| #15532 | Opus 4.8 自适应思考 | ✅ | |
| #15644 | HTML 产物用 openPath 打开 | ✅ | 更适合内网本地打开 |
| #15727 | 避免 embedding dimensions 请求参数 | ✅ | 含单测 |
| #15391 | Mermaid 11.15.0 修复中文流程图 | ✅ | |
| #15358 | Agent 任务完成状态同步 | ✅ | |
| #15410 | CherryIN OAuth 绑定 sender | ❌ | 内网不使用 CherryIN |
| — | v1.9.9/10/11 release chore | ❌ | 由内网自行 bump 版本 |

`scripts/__tests__/upstream-sync.test.ts` 改为对照 `v1.9.11` 标签。

## 9. 上游同步记录 (2026-06-15)

从 `CherryHQ/cherry-studio` 分支 `v1`（`v1.9.11` 标签之后）cherry-pick 了 10 个修复/功能提交：

| PR | 说明 | 内网适用 | 备注 |
|----|------|----------|------|
| #15834 | DeepSeek V4+ reasoning_effort 转发 | ✅ | |
| #15872 | Claude Fable 系列与 Opus 5 能力识别 | ✅ | |
| #15779 | Anthropic 原生 /v1/models 拉取 | ✅ | |
| #15839 | 折叠工具组审批按钮防误触折叠 | ✅ | |
| #15934 | NewAPI provider 使用 anthropicApiHost | ✅ | |
| #15978 | Agent 模式注入 Cherry Studio 身份 headers | ✅ | |
| #15301 | SVG data URL 图片下载 CSP 修复 | ✅ | |
| #14668 | 保存图片时恢复扩展名前导点 | ✅ | |
| #15991 | MiniMax-M3 思考过程控制修复 | ✅ | 含单测 |
| #16017 | Kimi K2.7 Code 模型支持 | ✅ | |

`scripts/__tests__/upstream-sync.test.ts` 改为对照 `upstream/v1` 分支（不再仅对照 `v1.9.11` 标签）。

---

## 10. 上游同步记录 (2026-06-30)

从 `CherryHQ/cherry-studio` 分支 `v1`（`v1.9.11` 标签之后，承接第 9 节未覆盖部分）cherry-pick 了 6 个修复提交，并内网化适配 1 个提交：

| PR | 说明 | 内网适用 | 备注 |
|----|------|----------|------|
| #16079 | ai-core 异常 finish reason 转错误 chunk | ✅ | 9 个外语 translate 文件冲突手动合并（保留内网专属 key，取上游翻译） |
| #15329 | ExaMCP 保留完整 URL + Highlights 解析 | ✅ | |
| #16371 | AIHubMix 从配置 baseURL 推导 Gemini baseURL | ✅ | |
| #16556 | `fs.statfs` 修 Windows PowerShell 进程泄漏 | ✅ | `main/ipc.ts` auto-merge |
| #15369 | claude-code 原生二进制缺失时恢复安装 | ✅ | |
| #16437 | Claude Code agents 使用第一个配置 key | ✅ | `claudecode/index.ts` 与第 9 节 #15978 auto-merge |
| (无号) | CherryIN API host `.cc` → `.net` | ✅ | **内网化适配**（commit `48154e9b15`）：上游原 migration 207/208 撞内网体系（207=intranet provider 清理、208=StepFun backfill），改为新 migration 211，persist version 210→211 |

**仍跳过**：
- 🔴 release v1.9.12 chore（无 PR 号，内网自行 bump）、windows-2022 构建环境（无 PR 号，内网已在 `99093cf2b`/`70cc4ec97` pin）

**版本号保持 1.9.11**（部分同步，未完整对齐 v1.9.12，故不改 `UPSTREAM_SYNC_TAG`/`package.json`）。

`scripts/__tests__/upstream-sync.test.ts` 修复 `collectPrNumbers` 读取完整 commit body（`%B` 而非仅 `%s` subject），使第 9 节的 squash 合并提交（PR #16）body 里列举的 PR 号能被识别为已同步，消除假阳性误报。

内网专属逻辑未受影响：网络守卫 / allowlist / provider 替换 / disabled surfaces 均保持不变。

---

## 同步优先级

| 优先级 | 修改项 | 说明 |
|--------|--------|------|
| 高 | 模型列表过滤 | 解决实际问题，通用性强 |
| 中 | React Hooks 依赖修复 | 代码质量改进 |
| 低 | 工程技能配置 | 需团队确认 |
| 不同步 | CherryAI → Intranet | 内网专用 |

---

## 配置说明

### 内网/离线网络策略（2026-06-01）

- 见根目录 `CONTEXT.md`：内网模式 **不是** 只能访问本机模型，可访问用户在 Provider 中配置的内网域名/API 地址。
- 完全离线版默认 deny-all，仅按协议、主机、端口和路径前缀放行 **已启用模型 Provider** 上配置的 `apiHost` / `anthropicApiHost`。
- 相关实现：`packages/shared/config/providerEndpoints.ts`、`packages/shared/config/intranet.ts`。

已为项目启用 `CLAUDE_MEM_RUNTIME = server-beta` 以支持完整记忆功能：
- 全局配置: `~/.claude.json`
- 项目配置: `.claude/settings.json`
