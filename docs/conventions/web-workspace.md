# 前端工作区文件操作

- `apps/web/src/lib/workspaceFiles.ts` 默认导出 `useWorkspaceFiles`。组件与前端工具统一复用此入口，不重复封装 Axios 或直接拼接 `/api/workspaces/files/*` 请求。
- 方法中的 `path`、`target` 均为工作区内的相对路径，例如 `画布1.json`、`assets/image.png`；目录参数使用绝对路径。
- 不传目录时，使用 Pinia 中当前项目的工作目录，每次操作重新读取；在 Pinia 初始化后的组件 `setup` 中创建实例。未选择工作目录时操作报错。

```ts
import useWorkspaceFiles from "@/lib/workspaceFiles";

const files = useWorkspaceFiles();
const { directory, entries } = await files.list();
const content = await files.readText("说明.txt");
await files.write("说明.txt", content);
```

## 目录绑定

- `useWorkspaceFiles(directory)`：传入目录字符串，固定该实例的目标目录；普通 TypeScript 工具函数可直接使用，不依赖当前 Pinia 实例。
- `useWorkspaceFiles(directoryRef)` 或 `useWorkspaceFiles(() => props.directory)`：传入 ref 或 getter，每次操作读取最新值；显式目录为空时直接报错，不回退到当前项目。
- 新建项目尚未更新 Pinia 时，显式传入用户选择的目录；`list()` 返回服务端规范化后的 `directory`，后续创建与失败回滚使用同一规范目录。
- 防抖、保存队列、跨 `await` 的多步操作必须在操作开始时取得目录字符串快照，后续步骤复用固定目录实例，避免切换项目后读写到另一个目录。自动保存与防抖仍由所属页面管理，文件封装不自动监听或保存数据。

```ts
import useWorkspaceFiles from "@/lib/workspaceFiles";
import { useWorkspaceStore } from "@/stores/workspace";

const workspaceStore = useWorkspaceStore();

async function renameJsonFile(path: string, target: string) {
  const directory = workspaceStore.project?.directory;
  if (!directory) throw new Error("请先选择工作目录");
  const files = useWorkspaceFiles(directory);
  await files.rename(path, target);
  return files.readJson(target);
}
```

## 方法与返回值

所有文件操作均返回 Promise；写入、改名、删除、建目录成功时无返回内容。

| 方法 | 用法与返回值 |
| --- | --- |
| `list(path = "")` | 列出一层目录，返回 `{ directory, entries }`；每项包含 `name`、相对 `path`、`type`（`file` 或 `directory`）。 |
| `read(path)` | 读取二进制，返回 `ArrayBuffer`。 |
| `readText(path, maxBytes?)` | 读取文本，返回字符串；传入正整数 `maxBytes` 时通过 HTTP Range 只读取文件头指定字节数。 |
| `readJson<T = unknown>(path)` | 读取并解析 JSON，返回 `T`；泛型仅提供类型提示，不校验文件结构。 |
| `write(path, content, exclusive = false)` | 写入字符串、`Blob` 或 `ArrayBuffer`；默认创建或覆盖整个文件，第三个参数传 `true` 时只允许新建。 |
| `writeJson(path, data, exclusive = false)` | 将数据格式化为 JSON 后写入；第三个参数传 `true` 时只允许新建。 |
| `rename(path, target)` | 在工作区内改名或移动文件、目录；目标已存在时不覆盖。 |
| `remove(path, recursive = false)` | 删除文件或空目录；显式传 `true` 才递归删除目录内容。 |
| `mkdir(path)` | 创建目录；父目录须存在，不自动递归创建。 |

- 文件的标记字段和业务结构由调用方负责，例如画布的 `toonflowCanvas`、对话的 `toonflowAgent`；不能因调用了 `readJson<T>` 就假定结构有效。
- 所有请求错误原样抛给调用方处理，JSON 解析失败抛出 `SyntaxError`；不要吞掉写入失败或无条件重试。新增文件的自动编号只处理服务端明确返回的同名冲突。
- 此封装只负责工作区文件；全局设置继续使用设置接口，项目列表继续由 Pinia 持久化，移除列表项不等于删除工作区文件。
