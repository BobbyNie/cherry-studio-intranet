# 内网版本修改总结

> 最后更新: 2025-05-12
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

## 同步优先级

| 优先级 | 修改项 | 说明 |
|--------|--------|------|
| 高 | 模型列表过滤 | 解决实际问题，通用性强 |
| 中 | React Hooks 依赖修复 | 代码质量改进 |
| 低 | 工程技能配置 | 需团队确认 |
| 不同步 | CherryAI → Intranet | 内网专用 |

---

## 配置说明

已为项目启用 `CLAUDE_MEM_RUNTIME = server-beta` 以支持完整记忆功能：
- 全局配置: `~/.claude.json`
- 项目配置: `.claude/settings.json`
