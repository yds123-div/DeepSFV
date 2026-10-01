# 领域文档

各工程技能在探索本仓库代码时，应如何消费这里的领域文档。

本仓库采用**单上下文**布局：根目录一份 `CONTEXT.md`，配一个 `docs/adr/`。

## 探索之前先读这些

- 根目录的 **`CONTEXT.md`**。
- **`docs/adr/`** —— 读与你要动的区域相关的 ADR。

这些文件**目前都还不存在**。不存在时**静默继续**：不要指出它们缺失，也不要主动提议创建。`/domain-modeling` 技能（经 `/grill-with-docs` 与 `/improve-codebase-architecture` 抵达）会在术语或决策真正被敲定时按需创建。

## 布局

单上下文仓库（本仓库）：

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-xxx.md
│   └── 0002-yyy.md
└── apps/ 、packages/
```

> 本仓库虽然是 workspaces 多包结构（`apps/*`、`packages/*`、`packages/nodes/*`、`packages/tools/*`、`packages/teams/*`），但当前按单上下文处理 —— 各包共享同一套领域语言。
> 若以后确认 `apps/web`、`apps/server` 等确属不同领域、各自有专属词汇，再改为多上下文：根目录放 `CONTEXT-MAP.md` 指向各上下文自己的 `CONTEXT.md` 与 `docs/adr/`。

## 使用术语表里的词

输出里提到某个领域概念时（issue 标题、重构提案、假设、测试名），用 `CONTEXT.md` 里定义的词，不要漂移到术语表明确回避的同义词。

如果你需要的概念还不在术语表里，这本身是个信号 —— 要么你在发明项目并不使用的说法（重新考虑），要么确实存在缺口（记下来交给 `/domain-modeling`）。

## ADR 冲突要摆到台面上

如果你的输出与既有 ADR 矛盾，明确指出来，不要静默覆盖：

> _与 ADR-0007（事件溯源订单）矛盾 —— 但值得重开，因为……_