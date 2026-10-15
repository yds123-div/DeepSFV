<template>
  <div class="about">
    <div class="brand">
      <div class="brandMark"><img class="brandLogo" :src="logoUrl" alt="DeepSFV Logo" /></div>
      <div class="brandInfo">
        <h3>DeepSFV</h3>
        <div class="brandMeta">
          <span>v{{ currentVersion }}</span>
          <el-tag v-if="channel" type="info" size="small" round>{{ channel }}</el-tag>
        </div>
      </div>
    </div>
    <div v-if="buildHash" class="buildInfo">
      <span>构建标识</span>
      <code>{{ buildHash }}</code>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import axios from "axios";
import logoUrl from "@toonflow/assets/logo.png";
import type { updateSnapshot } from "@toonflow/server/desktop";

const isDesktop = new URLSearchParams(window.location.search).get("desktop") === "1";
const snapshot = ref<updateSnapshot | null>(null);
const currentVersion = computed(() => snapshot.value?.version || import.meta.env.appVersion);
const channel = computed(() => snapshot.value?.channel || "");
const buildHash = computed(() => snapshot.value?.hash || "");
const controller = new AbortController();

onMounted(async () => {
  if (!isDesktop) return;
  try {
    const { data } = await axios.get<{ data: updateSnapshot }>("/api/desktop/update", { signal: controller.signal, timeout: 10000 });
    snapshot.value = data.data;
  } catch {
    // ACT: 状态读取失败仍显示构建版本。
  }
});
onBeforeUnmount(() => controller.abort());
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

  .buildInfo {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px 12px;
    color: var(--el-text-color-secondary);
    font-size: 12px;

    code {
      overflow-wrap: anywhere;
    }
  }
}
</style>
