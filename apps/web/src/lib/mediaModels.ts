import axios from "axios";
import { ref } from "vue";
import { defaultMediaModels, mediaModelTypes, updateDefaultMediaModel, type MediaModelType } from "@/stores/settings";

export type MediaModelOption = { providerId: string; providerLabel: string; modelId: string; label: string; type: MediaModelType };
export const mediaModelLabels: Record<MediaModelType, string> = { image: "图片模型", video: "视频模型", audio: "音频模型" };
export const mediaModelOptions = ref<MediaModelOption[]>([]);

// ACT: 不缓存，获取模型或删除供应商后重新打开面板要看到最新列表。
export async function loadMediaModelOptions() {
  const { data } = await axios.get<{ code: number; data: MediaModelOption[] }>("/api/ai/media/models", {
    headers: { "x-toonflow-workspace": "1", "Cache-Control": "no-cache" },
  });
  if (data.code !== 200) throw new Error("读取媒体模型失败");
  mediaModelOptions.value = data.data.filter(item => (mediaModelTypes as readonly string[]).includes(item.type));
  return mediaModelOptions.value;
}

export function mediaModelOptionsOf(type: MediaModelType) {
  return mediaModelOptions.value.filter(item => item.type === type);
}

// ACT: 已失效的选择不塞回下拉（会显示成原始键值），留空并提示重选，由调用方回退列表首个。
export function mediaModelSelectValue(type: MediaModelType) {
  const choice = defaultMediaModels.value[type];
  if (!choice) return "";
  const available = mediaModelOptionsOf(type).some(item => item.providerId === choice.providerId && item.modelId === choice.modelId);
  return available ? JSON.stringify([choice.providerId, choice.modelId]) : "";
}

export function isMediaModelExpired(type: MediaModelType) {
  return !!defaultMediaModels.value[type] && !mediaModelSelectValue(type);
}

export function setDefaultMediaModel(type: MediaModelType, value: string) {
  if (!value) return updateDefaultMediaModel(type, undefined);
  const [providerId, modelId] = JSON.parse(value) as [string, string];
  updateDefaultMediaModel(type, { providerId, modelId });
}