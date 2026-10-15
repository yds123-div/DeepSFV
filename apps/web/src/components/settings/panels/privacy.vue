<template>
  <div class="privacy">
    <section class="settingSection" aria-labelledby="collectionTitle">
      <h3 id="collectionTitle">匿名使用统计</h3>
      <p class="description">已停用向外部服务上报使用数据。本地不会再发送匿名统计。</p>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.privacy {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 0 4px 8px;

  .settingSection {
    min-width: 0;

    h3 {
      margin: 0 0 12px;
      color: var(--el-text-color-primary);
      font-size: 14px;
      font-weight: 600;
    }

    .description {
      margin: 0;
      color: var(--el-text-color-secondary);
      font-size: 13px;
      line-height: 1.6;
    }
  }
}
</style>
