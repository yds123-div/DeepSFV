# Triage 标签

各技能用五个规范的分流角色来表述。本文件把这些角色映射到本仓库 issue 追踪器里实际使用的标签字符串。

| mattpocock/skills 中的标签 | 本仓库追踪器中的标签 | 含义                                 |
| ------------------------- | ------------------- | ------------------------------------ |
| `needs-triage`            | `needs-triage`      | 维护者需要评估这个 issue             |
| `needs-info`              | `needs-info`        | 等待报告者补充信息                   |
| `ready-for-agent`         | `ready-for-agent`   | 已完整规格化，可交给 AFK 代理执行    |
| `ready-for-human`         | `ready-for-human`   | 需要人工实现                         |
| `wontfix`                 | `wontfix`           | 不会被处理                           |

技能提到某个角色时（例如「apply the AFK-ready triage label」），就用上表右列对应的标签字符串。

本仓库沿用默认命名，没有覆盖项 —— 右列与左列一致。若以后追踪器改用了别的写法（例如 `bug:triage` 对应 `needs-triage`），只改右列即可。

每个已分流的 issue 应当恰好带一个类别角色和一个状态角色。状态角色冲突时，先标记出来并在做其他事之前询问维护者。