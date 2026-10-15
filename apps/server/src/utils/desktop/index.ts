import { basename } from "node:path";
import type { Request } from "express";
import type { DesktopRuntime, updateSnapshot } from "@/types/desktop";

interface DesktopState {
  selectedProviderFile?: { token: string; path: string };
}

export function isValidUpdateUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value || value.length > 2048 || value.trim() !== value || !URL.canParse(value)) return false;
  const url = new URL(value);
  return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password && !url.search && !url.hash;
}

function refuseDesktopUpdate(): never {
  throw Object.assign(new Error("应用内更新已停用"), { status: 400 });
}

function getDesktopState(req: Request): DesktopState {
  return req.app.locals.desktopState ??= {};
}

export function getDesktopRuntime(req: Request): DesktopRuntime {
  return req.app.locals.desktop;
}

export async function selectProviderFile(req: Request) {
  const path = await getDesktopRuntime(req).selectProviderFile();
  if (!path) return null;
  if (!/\.ts$/i.test(path)) throw Object.assign(new Error("请选择 .ts 供应商文件"), { status: 400 });
  const selected = { token: crypto.randomUUID(), path };
  getDesktopState(req).selectedProviderFile = selected;
  return { token: selected.token, name: basename(path) };
}

export async function readProviderFile(req: Request, token: string) {
  const selected = getDesktopState(req).selectedProviderFile;
  if (!selected || token !== selected.token) throw Object.assign(new Error("请重新选择并授权供应商文件"), { status: 403 });
  const file = Bun.file(selected.path);
  if (!(await file.exists())) throw Object.assign(new Error("供应商文件已被移动或删除，请重新选择"), { status: 404 });
  if (file.size > 2 * 1024 * 1024) throw Object.assign(new Error("供应商文件不能超过 2 MB"), { status: 400 });
  return { name: basename(selected.path), source: await file.text(), lastModified: file.lastModified };
}

export async function getDesktopUpdate(req: Request): Promise<updateSnapshot> {
  const { updater } = getDesktopRuntime(req);
  const { version, channel, hash } = await updater.getLocalInfo();
  return {
    version, channel, hash,
    latestVersion: "",
    latestHash: "",
    error: "",
    updateAvailable: false,
    updateReady: false,
    updating: false,
    canUpdate: false,
  };
}

export async function checkDesktopUpdate(_req: Request): Promise<void> {
  refuseDesktopUpdate();
}

export async function downloadDesktopUpdate(_req: Request): Promise<void> {
  refuseDesktopUpdate();
}

export async function applyDesktopUpdate(_req: Request): Promise<void> {
  refuseDesktopUpdate();
}
