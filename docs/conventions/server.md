# Server 开发规范

以下规则适用于 `apps/server`，与 `AGENTS.md` 的通用代码规范同时遵守。

## 技术栈与职责

- 使用 Bun、TypeScript、ES Modules 和 Express，沿用现有依赖与工具，不另建服务框架。
- `src/index.ts` 是独立 server 的启动入口，单进程监听端口。
- `src/app.ts` 的 `createApp({ webRoot, dataDirectory?, ... })` 负责创建应用、装配中间件、静态资源、路由和统一错误处理，返回应用；传入的数据目录须在动态加载路由前设置。不要在这里启动监听或创建 worker。
- 桌面端通过 `@toonflow/server/app` 复用应用，不导入独立 server 的启动入口，不额外启动 cluster。

## 目录结构

```text
apps/server/
  package.json
  tsconfig.json
  src/
    index.ts                 # 独立服务启动
    app.ts                   # Express 应用装配
    core.ts                  # 根据文件目录生成路由
    router.ts                # 自动生成的路由注册文件
    utils.ts                 # 通用工具统一出口，默认导出对象
    utils/
      conf/index.ts          # conf 实例与配置
      mcp/                   # MCP 控制、工具和资源
    lib/
      middleware.ts          # 参数校验等 HTTP 中间件
      responseFormat.ts      # 统一响应格式
    routes/
      hello.ts               # 单个接口
      settings/              # 按业务分类
        get.ts               # 读取设置接口
        save.ts              # 保存设置接口
```

- 文件、目录、变量和函数统一小驼峰命名。业务按文件夹分层，层级已有语义时，文件名不重复堆叠业务名称，例如 `settings/get.ts`。
- **一个接口一个文件。** 每个路由文件只注册一个 HTTP 方法与路径，默认导出对应 Express Router；读取、保存等接口必须拆开。
- `routes/` 下的 `.ts` 文件都会被当作路由模块扫描，不能把工具、类型、配置或单纯的目录聚合文件放进去。
- 工具实现按业务模块放到 `utils/*/`，例如 `utils/mcp/control.ts`；文件名不重复模块前缀，通过 `utils.ts` 暴露。HTTP 中间件及响应格式放 `lib/`。不为简单接口额外搭建 controller、service、repository 等层。

## 路由与路径规则

- `core.ts` 扫描 `src/routes/**/*.ts`，根据文件相对路径生成 `/api` 前缀的路由；接口文件内使用 `"/"`，不要重复填写 `/api` 或业务目录。
- URL 使用 `/` 分隔，路径大小写与目录、文件名一致。`index.ts` 对应所在目录本身，不产生 `/index`。
- 当前设置接口映射如下，HTTP 方法由接口文件注册语句决定，文件名不会自动决定方法：

| 文件 | HTTP 方法 | 请求路径 |
| --- | --- | --- |
| `src/routes/settings/get.ts` | `GET` | `/api/settings/get` |
| `src/routes/settings/save.ts` | `PUT` | `/api/settings/save` |

- **不要手工维护 `src/router.ts` 的 imports、注册项或 hash。** 新增、移动、重命名或删除接口文件后，在 `apps/server` 执行 `bun run routes`。
- 自动生成的 `route1` 等名称由生成器维护，不手工重命名。`createApp` 仅在 `NODE_ENV === "dev"` 时自动生成路由，不假定启动、监听文件变化或构建会自动补齐路由。
- 改动路径或 HTTP 方法前搜索所有调用方，同步更新调用；文件归档不应意外改变配置文件、静态资源等磁盘路径。

## 引用与代码风格

- server 的 `@/` 指向 `apps/server/src/`，业务代码优先使用该别名，例如 `@/utils`、`@/lib/middleware`。不要把 `@/` 当作仓库根目录，也不要使用本机绝对路径或长串 `../../` 引用业务模块。
- 通用工具统一使用 `import u from "@/utils"`，例如 `u.conf`；具体工具的引入与导出由 `utils.ts` 管理，接口不绕过统一入口重复初始化工具。
- 跨工作区包使用包名及其声明的 exports，例如 `@toonflow/server/app`，不要直接穿透其他包的 `src/` 路径。
- 第三方库使用包名导入，新增 Node 内置模块引用使用 `node:` 前缀；仅用于类型的引用使用 `import type`。
- 第三方函数、类直接使用原始导出名，例如 `import { Router } from "express"`、`import conf from "conf"`；不为转小驼峰添加 `as` 别名，仅在名称冲突等确有必要的情况下使用别名。类型名保留 TypeScript 的类型命名习惯。
- 使用双引号、分号、两空格缩进，保持现有文件格式。文件按 imports、必要声明、接口注册与导出的顺序组织；删除未使用的 import 和变量。
- 路由内直接完成小而清晰的逻辑；只有实际复用或可读性收益时才提取函数。仅在需要等待异步操作时使用 `async`，不添加无意义的包装。

## 参数校验、响应与错误处理

- 外部输入使用现有 `validateFields` 与 Zod 校验，字段规则放在所属接口中；默认校验 `body`，查询参数与路径参数显式指定 `"query"`、`"params"`。
- `validateFields` 当前只校验，不将解析结果写回请求。不能假定 Zod 的默认值、转换或裁剪已应用到 `req.body` 等对象；需要规范化时显式处理。
- JSON 响应复用 `success`、`error`，保持 `{ code, data, message }` 结构。这两个函数只包装响应体，不设置 HTTP 状态；需要时显式使用 `res.status(...)`，使错误状态码与响应语义一致。不要在单个接口另造响应格式。
- 普通异常交由 `app.ts` 的统一错误处理中间件处理，禁止吞掉写入失败后返回成功。流式接口已发送响应头后，应沿用流内错误处理和资源清理方式。

## 配置与持久化

- `conf` 只在 `src/utils/conf/index.ts` 初始化，通过 `src/utils.ts` 统一导出，接口使用 `u.conf`。不要在每个接口或每次请求中创建实例。
- 配置统一存为数据目录下的 `settings.json`，保持 `configName: "settings"`、`configFileMode: 0o600`。开发环境使用仓库根目录 `data/`，该目录必须被 Git 忽略；生产环境使用安装目录下的 `data/`，不再使用默认用户配置目录。
- 启动入口通过 `createApp` 在路由加载前确定 `TOONFLOW_DATA_DIR`，读写必须使用同一目录。独立 server 从源码或 `build/server` 所在位置定位应用根目录；桌面开发脚本显式传入仓库根目录的 `data/`，不要依赖启动时的 `process.cwd()`。
- Windows 桌面使用实际安装根目录的 `data/`（与可更新的 `app/` 同级），macOS 使用 `.app` 所在目录的 `data/`。不要写入可被更新替换的程序资源或应用包内部。
- 当前保存接口接收 `{ settings: { ... } }`，使用 `z.record(z.string(), z.json())` 校验设置对象；完整覆盖保存，读取时返回 `settings`，未保存时返回 `{}`。
- 未经相关需求，不将完整覆盖改成部分合并。工具实例与文件占用状态是进程内单例，不支持多进程并发写入同一工作区。

## 验证要求

- 在 `apps/server` 执行命令：路由文件变更后先 `bun run routes`，按改动执行 `bun run typecheck`、`bun run build` 和必要的实际 HTTP 验证。
- 涉及配置读写的验证使用临时配置目录，检查保存、读取及非法输入，避免覆盖真实用户配置。
- 禁止编写或新增任何测试文件；默认不新增测试框架或自动检查入口。只报告实际完成的验证，构建通过不等于接口或持久化行为已经验证。

## 媒体供应商接入

自定义媒体供应商（`data/providers/*.ts`）由用户从「设置 → 媒体模型 → 添加自定义供应商」导入，服务端在 VM 沙箱中执行。接入前先读这三处，不要凭 `types.d.ts` 自行设计结构：

- **权威规范**：`apps/web/src/components/settings/panels/mediaModel/providerPrompt.ts` —— 即该弹窗「一键复制提示词」的正文，写明了导出形式、字面量限制、禁止 import、可用全局与生成方法的写法等全部硬约束。
- **调试通道**：`POST /api/providers/debug/run`（`apps/server/src/routes/providers/debug/run.ts`）—— 流式返回 NDJSON，30 分钟预算，会打印每一次 `this.tool.fetch` 的请求与响应并自动打码密钥；`POST /api/providers/debug/inspect` 只做源码校验。验证供应商优先走这里，不要靠画布点生成 —— 每次失败都要赔一次真实生成耗时。
- **本地校验**：`loadMediaProviderSource(source, config)`（`apps/server/src/utils/media/provider.ts`）可先行跑完整的 AST 校验与 VM 求值。仓库外的脚本解析不到 tsconfig 的 `@/*` 别名，需用绝对路径 import 或把脚本放在 `apps/server/` 下。

**单次生成的墙钟预算约 300 秒**，超过即被 `this.tool.fetch` 中断（实测 298.6 秒），provider 侧无法规避（沙箱禁止 import，只能用 `this.tool.fetch`）。按错误码分流成因：`code 23` 是 `TIMEOUT_ERR`（超时触发），`code 20` 是 `ABORT_ERR`（调用方取消），`ECONNRESET` 加 `socket closed unexpectedly` 是对端关闭连接 —— 把这三者混为一谈会得出完全错误的根因。
已排除该 300 秒来自 `AbortSignal.timeout` 被截断（实测 600000 毫秒的信号在 340 秒时仍未触发，说明它按请求值生效）。未确认该信号在 600 秒处是否真的触发。

**写进 `models` 的每个尺寸与模式，上线前必须各跑通一次真实生成。** 接口文档允许的范围不等于这台机器跑得完的范围。
