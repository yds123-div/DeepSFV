<template>
  <div class="about">
    <div class="brand">
      <div class="brandMark"><img class="brandLogo" :src="logoUrl" alt="DeepSFV Logo" /></div>
      <div class="brandInfo">
        <h3>DeepSFV</h3>
        <div class="brandMeta">
          <span>v{{ currentVersion }}</span>
          <el-tag v-if="snapshot?.channel" type="info" size="small" round>{{ snapshot.channel }}</el-tag>
        </div>
      </div>
    </div>

    <el-card class="infoCard updateCard" shadow="never">
      <div class="cardHeader">
        <div class="updateCopy">
          <div class="cardLabel">
            <icon-refresh :size="18" aria-hidden="true" />
            <span>版本更新</span>
          </div>
        </div>
        <div class="updateActions">
          <el-select :modelValue="updateSource" aria-label="更新源" size="small" :disabled="working || sourceSaving" @change="saveUpdateSource">
            <template #prefix>
              <icon-brand-github v-if="updateSource === 'github'" :size="14" aria-hidden="true" />
              <icon-world v-else :size="14" aria-hidden="true" />
            </template>
            <el-option label="官方源" value="official" />
            <el-option label="GitHub" value="github" />
            <el-option v-if="customUpdateUrl" label="自定义源" value="custom" />
          </el-select>
          <el-badge isDot :hidden="!hasDesktopUpdate">
            <el-button size="small" type="primary" plain :loading="checking" :disabled="sourceSaving" @click="openUpdate">
              {{ snapshot?.updateReady ? "更新已就绪" : snapshot?.updating || action === "download" ? "查看更新进度" : "检查更新" }}
            </el-button>
          </el-badge>
        </div>
      </div>
      <div v-if="snapshot?.hash" class="buildInfo">
        <span>构建标识</span>
        <code>{{ snapshot.hash }}</code>
      </div>
    </el-card>

    <el-dialog v-model="resultVisible" title="版本更新" width="min(480px, 92vw)" alignCenter appendToBody>
      <div class="updateResult" aria-live="polite" :aria-busy="working">
        <div class="resultHeader">
          <span class="resultIcon" :class="{ warning: !!updateError, success: !working && !updateError && !snapshot?.updateAvailable }">
            <icon-refresh v-if="working" class="loadingIcon" :size="22" aria-hidden="true" />
            <icon-alert-circle v-else-if="updateError" :size="22" aria-hidden="true" />
            <icon-arrow-up-circle v-else-if="snapshot?.updateAvailable" :size="22" aria-hidden="true" />
            <icon-circle-check v-else :size="22" aria-hidden="true" />
          </span>
          <div class="resultCopy">
            <h3>{{ resultTitle }}</h3>
            <p>{{ resultMessage }}</p>
          </div>
        </div>
        <div v-if="!checking && !updateError && snapshot?.updateAvailable" class="releaseInfo">
          <div class="versionComparison">
            <div class="versionItem">
              <span>当前版本</span>
              <strong>v{{ currentVersion }}</strong>
            </div>
            <icon-arrow-right class="versionArrow" :size="18" aria-hidden="true" />
            <div class="versionItem latestVersion">
              <span>最新版本</span>
              <strong>v{{ snapshot.latestVersion }}</strong>
            </div>
          </div>
          <div v-if="snapshot.channel || snapshot.latestHash" class="releaseMeta">
            <el-tag v-if="snapshot.channel" type="info" size="small" round>{{ snapshot.channel }}</el-tag>
            <code v-if="snapshot.latestHash" :title="snapshot.latestHash">{{ snapshot.latestHash }}</code>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button size="small" @click="resultVisible = false">关闭</el-button>
        <el-button
          v-if="snapshot?.canUpdate && snapshot.updateAvailable"
          size="small"
          type="primary"
          :loading="working"
          @click="runUpdate(snapshot.updateReady ? 'apply' : 'download')">
          {{ snapshot.updateReady ? "重启并更新" : "下载更新" }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
import axios from "axios";
import { ElMessage } from "element-plus";
import {
  IconRefresh,
  IconBrandGithub,
  IconAlertCircle,
  IconArrowUpCircle,
  IconCircleCheck,
  IconArrowRight,
} from "@tabler/icons-vue";
import logoUrl from "@toonflow/assets/logo.svg";
import type { updateSnapshot } from "@toonflow/server/desktop";
import { saveSettings } from "@/stores/settings";
import {
  desktopUpdateSource as updateSource,
  desktopUpdateCustomUrl as customUpdateUrl,
  desktopUpdateKey as updateKey,
  desktopUpdateSnapshot as snapshot,
  desktopUpdateError as updateError,
  desktopUpdateChecking,
  hasDesktopUpdate,
  checkDesktopUpdate,
} from "@/stores/desktopUpdate";

const isDesktop = new URLSearchParams(window.location.search).get("desktop") === "1";
const currentVersion = computed(() => snapshot.value?.version || import.meta.env.appVersion);
const action = ref<"check" | "download" | "apply" | null>(null);
const sourceSaving = ref(false);
const checking = computed(() => desktopUpdateChecking.value || action.value === "check");
const working = computed(() => checking.value || !!action.value || !!snapshot.value?.updating);
const resultVisible = ref(false);
const controller = new AbortController();
const resultTitle = computed(() => {
  if (updateError.value) return "更新未完成";
  if (checking.value) return "正在检查更新";
  if (action.value === "apply") return "正在重启并更新";
  if (working.value) return "正在准备更新";
  if (snapshot.value?.updateReady) return "更新已准备完成";
  return snapshot.value?.updateAvailable ? "发现新版本" : "暂无更新";
});
const resultMessage = computed(() => {
  if (updateError.value) return updateError.value;
  if (checking.value) return "正在获取最新版本信息…";
  if (action.value === "apply") return "客户端即将关闭，更新完成后会自动重新打开。";
  if (working.value) return "正在下载并校验更新包，可以关闭此弹窗继续使用。";
  if (snapshot.value?.updateReady) return "点击“重启并更新”安装新版本，请先完成正在进行的任务。";
  if (!snapshot.value?.updateAvailable) return `当前已是最新版本 v${currentVersion.value}`;
  return snapshot.value.canUpdate ? "有新的版本可用，下载完成后可重启更新。" : "当前客户端不支持应用内更新，请下载安装包。";
});

onMounted(async () => {
  if (!isDesktop || desktopUpdateChecking.value) return;
  const previous = snapshot.value;
  const source = updateKey.value;
  try {
    const { data } = await axios.get<{ data: updateSnapshot }>("/api/desktop/update", { signal: controller.signal, timeout: 10000 });
    if (snapshot.value === previous && updateKey.value === source && !sourceSaving.value && !action.value && !desktopUpdateChecking.value) {
      snapshot.value = data.data;
      updateError.value = data.data.error;
    }
  } catch {
    // ACT: 状态读取失败仍显示构建版本；检查按钮会展示具体错误。
  }
});
onBeforeUnmount(() => controller.abort());

watch([resultVisible, () => snapshot.value?.updating, action], ([visible, updating, currentAction], _, onCleanup) => {
  if ((!visible && currentAction !== "apply") || !updating || (currentAction && currentAction !== "apply")) return;
  // ACT: 下载请求自行返回结果；重启交接后继续同步，捕获宿主退出失败。
  let refreshing = false;
  const timer = setInterval(async () => {
    if (refreshing) return;
    refreshing = true;
    try {
      const { data } = await axios.get<{ data: updateSnapshot }>("/api/desktop/update", { signal: controller.signal, timeout: 10000 });
      snapshot.value = data.data;
      updateError.value = data.data.error;
      if (data.data.error && action.value === "apply") action.value = null;
    } catch (error) {
      if (controller.signal.aborted) return;
      if (action.value === "apply" && axios.isAxiosError(error) && error.code === "ERR_NETWORK") clearInterval(timer);
      else updateError.value = getUpdateError(error);
    } finally {
      refreshing = false;
    }
  }, 1500);
  onCleanup(() => clearInterval(timer));
});

function openUpdate() {
  resultVisible.value = true;
  if (working.value || snapshot.value?.updateReady) return;
  void runUpdate("check");
}

async function saveUpdateSource(source: string) {
  if (source === updateSource.value || sourceSaving.value || working.value) return;
  if (source !== "official" && source !== "github" && (source !== "custom" || !customUpdateUrl.value)) return;
  sourceSaving.value = true;
  try {
    await saveSettings(() => ({ desktopUpdateSource: source }));
  } catch (error) {
    ElMessage.error(getUpdateError(error));
  } finally {
    sourceSaving.value = false;
  }
}

function getUpdateError(error: unknown) {
  return axios.isAxiosError<{ message?: string }>(error) ? error.response?.data?.message || error.message : String(error);
}

async function runUpdate(nextAction: "check" | "download" | "apply") {
  if (working.value || sourceSaving.value) return;
  updateError.value = "";
  if (!isDesktop) {
    updateError.value = "请在桌面客户端中检查更新。";
    return;
  }
  action.value = nextAction;
  try {
    if (nextAction === "check") await checkDesktopUpdate();
    else {
      const { data } = await axios.post<{ data: updateSnapshot }>(`/api/desktop/update/${nextAction}`, null, {
        headers: { "x-toonflow-desktop": "1" },
        signal: controller.signal,
        timeout: 0,
      });
      snapshot.value = data.data;
    }
    updateError.value = snapshot.value?.error || (snapshot.value?.channel === "dev" ? "开发版本不提供更新检查，请使用正式桌面客户端。" : "");
  } catch (error) {
    if (!controller.signal.aborted) {
      updateError.value = getUpdateError(error);
      try {
        const { data } = await axios.get<{ data: updateSnapshot }>("/api/desktop/update", { signal: controller.signal, timeout: 10000 });
        snapshot.value = data.data;
      } catch {
        // ACT: 状态读取失败时保留本次操作的错误，不覆盖诊断信息。
      }
    }
  } finally {
    if (nextAction !== "apply" || updateError.value) action.value = null;
  }
}
</script>

<style lang="scss" scoped>
.about {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .brand {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 4px 0 12px;

    .brandMark {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 60px;
      height: 60px;
      border-radius: calc(var(--ui-radius) * 1.5);
      background: var(--el-fill-color-light);

      .brandLogo {
        width: 42px;
        height: 42px;
        object-fit: contain;

        .dark & {
          filter: invert(1);
        }
      }
    }

    .brandInfo {
      min-width: 0;

      h3 {
        margin: 0 0 8px;
        color: var(--el-text-color-primary);
        font-size: 20px;
        font-weight: 600;
      }

      .brandMeta {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        color: var(--el-text-color-secondary);
        font-size: 12px;
      }
    }
  }

  .infoCard {
    min-width: 0;
    border-radius: calc(var(--ui-radius) * 1);

    :deep(.el-card__body) {
      padding: 14px;
    }

    .cardHeader {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;

      .cardLabel {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--el-text-color-primary);
        font-size: 14px;
        font-weight: 600;
      }
    }

    &.updateCard {
      .cardHeader {
        .updateCopy {
          flex: 1;
          min-width: 120px;

          .cardDescription {
            margin-top: 4px;
          }
        }

        .updateActions {
          display: flex;
          align-items: center;
          gap: 8px;

          :deep(.el-select) {
            width: 120px;
          }
        }
      }
    }

    .buildInfo {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 8px 12px;
      margin-top: 12px;
      color: var(--el-text-color-secondary);
      font-size: 12px;

      code {
        overflow-wrap: anywhere;
      }
    }

  }

}

.updateResult {
  padding: 8px 0;

  .resultHeader {
    display: flex;
    align-items: flex-start;
    gap: 12px;

    .resultIcon {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: calc(var(--ui-radius) * 1.25);
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);

      &.warning {
        background: var(--el-color-warning-light-9);
        color: var(--el-color-warning);
      }
      &.success {
        background: var(--el-color-success-light-9);
        color: var(--el-color-success);
      }
      .loadingIcon {
        animation: spin 1.2s linear infinite;
      }
    }

    .resultCopy {
      min-width: 0;

      h3 {
        margin: 0 0 6px;
        color: var(--el-text-color-primary);
        font-size: 15px;
        font-weight: 600;
      }
      p {
        margin: 0;
        color: var(--el-text-color-secondary);
        font-size: 13px;
        line-height: 1.6;
        overflow-wrap: anywhere;
      }
    }
  }

  .releaseInfo {
    margin-top: 20px;
    padding: 14px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: calc(var(--ui-radius) * 1);

    .versionComparison {
      display: flex;
      align-items: center;
      gap: 16px;

      .versionItem {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 8px;
        min-width: 0;

        span {
          color: var(--el-text-color-secondary);
          font-size: 12px;
        }
        strong {
          color: var(--el-text-color-primary);
          font-size: 18px;
          font-weight: 600;
          overflow-wrap: anywhere;
        }
        &.latestVersion strong {
          color: var(--el-color-primary);
        }
      }

      .versionArrow {
        flex-shrink: 0;
        color: var(--el-text-color-placeholder);
      }
    }

    .releaseMeta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid var(--el-border-color-lighter);
      color: var(--el-text-color-secondary);
      font-size: 12px;

      code {
        overflow-wrap: anywhere;
      }
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .updateResult .resultHeader .resultIcon .loadingIcon {
    animation: none;
  }
}
</style>
