import { shallowRef } from "vue";
import type { updateSnapshot } from "@toonflow/server/desktop";

// ACT: 应用内更新通道已停用；仅保留快照读取，供关于页与开发者选项展示本地版本。
export const desktopUpdateSnapshot = shallowRef<updateSnapshot | null>(null);
