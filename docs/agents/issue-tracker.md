# Issue tracker: GitHub

本仓库的 issue 和规格都放在 GitHub Issues，统一用 `gh` CLI 操作。

目标仓库：`yds123-div/DeepSFV` —— 它就是 `origin`，`gh` 在仓库内运行时会自动推断，不需要显式传 `--repo`。

> 本仓库是上游 Toonflow-app（`gitee.com/HBAI-Ltd/Toonflow-app`，MIT，版权归 HBAI-Ltd）的代码快照。
> 属于上游本身的问题请提到上游去；这里登记的是本仓库自己的问题。

## 约定

- **建 issue**：`gh issue create --title "..." --body "..."`，多行正文用 heredoc。
- **读 issue**：`gh issue view <number> --comments`，按需用 `jq` 过滤评论，并一并取标签。
- **列 issue**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，配合 `--label`、`--state` 过滤。
- **评论**：`gh issue comment <number> --body "..."`
- **加/去标签**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **关闭**：`gh issue close <number> --comment "..."`

## Pull requests as a request surface

**PRs as a request surface: no** —— 本仓库不把外部 PR 当作请求界面，`/triage` 只处理 issue。

改成 yes 时：把上一行改成 `yes`，并启用 `gh pr` 那一套 —— 读 PR 用 `gh pr view <number> --comments`、看差异用 `gh pr diff <number>`、列外部 PR 用 `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` 后只保留 `authorAssociation` 为 `CONTRIBUTOR`、`FIRST_TIME_CONTRIBUTOR`、`NONE` 的条目（丢掉 `OWNER`/`MEMBER`/`COLLABORATOR`）。GitHub 的 issue 与 PR 共用一套编号，裸 `#42` 可能是其中任一 —— 先 `gh pr view 42`，失败再回退到 `gh issue view 42`。

## 技能说「publish to the issue tracker」时

建一个 GitHub issue。

## 技能说「fetch the relevant ticket」时

执行 `gh issue view <number> --comments`。

## Wayfinding 操作

供 `/wayfinder` 使用。**地图**是单个 issue，**子票据**是它的子 issue。

- **地图**：一个带 `wayfinder:map` 标签的 issue，正文承载 Notes / Decisions-so-far / Fog。`gh issue create --label wayfinder:map`。
- **子票据**：通过 GitHub sub-issue 与地图关联（走 sub-issues 端点）。不支持 sub-issue 的环境下，把子票据列入地图正文的 task list，并在子票据正文顶部写 `Part of #<map>`。标签为 `wayfinder:<type>`（`research`/`prototype`/`grilling`/`task`）。被认领后指派给推进者。
- **阻塞**：用 GitHub 原生 issue dependency —— 这是唯一能在界面上看见的规范表示。加边命令：
  `gh api --method POST repos/yds123-div/DeepSFV/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`
  其中 `<blocker-db-id>` 是阻塞方的**数字 database id**（用 `gh api repos/yds123-div/DeepSFV/issues/<n> --jq .id` 取），**不是** `#number`，也不是 `node_id`。GitHub 通过 `issue_dependencies_summary.blocked_by` 报告阻塞数（只统计未关闭的阻塞方，这就是实时闸门）。dependency 不可用时，回退为在子票据正文顶部写一行 `Blocked by: #<n>, #<n>`。所有阻塞方关闭后，票据才算解除阻塞。
- **前沿查询**：列出地图下所有未关闭的子票据，丢掉仍有未关闭阻塞方的（`issue_dependencies_summary.blocked_by > 0`，或 `Blocked by` 行里还有未关闭的 issue）以及已指派给别人的；地图顺序里最靠前的那个胜出。
- **认领**：`gh issue edit <n> --add-assignee @me` —— 这是本次会话的第一次写操作。
- **解决**：先 `gh issue comment <n> --body "<答案>"`，再 `gh issue close <n>`，最后把一条上下文指针（gist + 链接）追加到地图的 Decisions-so-far。