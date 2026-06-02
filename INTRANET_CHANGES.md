# 内网版本修改总结

> 最后更新: 2026-06-01
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
