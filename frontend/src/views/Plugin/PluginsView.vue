<template>
  <div class="plugins-card" :class="{ mobile: isMobile }">
    <!-- 插件概览卡片 -->
    <div class="plugins-overview">
      <el-row :gutter="20">
        <el-col :xs="12" :sm="12" :md="12">
          <el-card class="overview-card">
            <div class="overview-content">
              <div class="left-content">
                <div class="overview-icon">
                  <Icon class="icon-size" icon="mdi:package-variant" />
                </div>
                <div class="text-content">
                  <h3 class="overview-title">插件总数</h3>
                  <p class="overview-desc">所有插件</p>
                </div>
              </div>
              <div class="right-content">
                <p class="overview-count">
                  {{ pluginStore.totalPluginsCount }}
                </p>
              </div>
            </div>
          </el-card>
        </el-col>
        <!-- <el-col :xs="12" :sm="12" :md="12" :lg="6" :xl="6">
          <el-card class="overview-card">
            <div class="overview-content">
              <div class="left-content">
                <div class="overview-icon">
                  <Icon class="icon-size" icon="mdi:check-circle" />
                </div>
                <div class="text-content">
                  <h3 class="overview-title">已分配</h3>
                  <p class="overview-desc">已分配插件</p>
                </div>
              </div>
              <div class="right-content">
                <p class="overview-count">
                  {{ pluginStore.assignedPluginsCount }}
                </p>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="12" :md="12" :lg="6" :xl="6">
          <el-card class="overview-card">
            <div class="overview-content">
              <div class="left-content">
                <div class="overview-icon">
                  <Icon class="icon-size" icon="mdi:circle-outline" />
                </div>
                <div class="text-content">
                  <h3 class="overview-title">未分配</h3>
                  <p class="overview-desc">未分配插件</p>
                </div>
              </div>
              <div class="right-content">
                <p class="overview-count">
                  {{ pluginStore.unassignedPluginsCount }}
                </p>
              </div>
            </div>
          </el-card>
        </el-col> -->
        <el-col :xs="12" :sm="12" :md="12">
          <el-card class="overview-card">
            <div class="overview-content">
              <div class="left-content">
                <div class="overview-icon">
                  <Icon class="icon-size" icon="mdi:harddisk" />
                </div>
                <div class="text-content">
                  <h3 class="overview-title">文件</h3>
                  <p class="overview-desc">占用</p>
                </div>
              </div>
              <div class="right-content">
                <p class="overview-count">
                  {{ pluginStore.pluginDirectorySize }}
                </p>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
    <!-- 插件目录文件管理 -->
    <PluginManager
      v-if="pluginStore.pluginDirectoryPath"
      :initial-path="pluginStore.pluginDirectoryPath"
      uploadTitle="上传插件"
      :show-actions="true"
      :upload-type="true"
      @fileUpdated="handleFileUpdated"
    />
  </div>
</template>

<script setup>
import { onMounted, inject } from "vue";
import { useAuthStore } from "@/stores/auth";
import { usePluginStore } from "@/stores/plugin";
import PluginManager from "@/components/plugin-manager/PluginManager.vue";
import { Icon } from "@iconify/vue";

// 注入 Swal 实例
const Swal = inject("$swal");

const isMobile = inject("isMobile");

const authStore = useAuthStore();
const pluginStore = usePluginStore();
// 获取插件概览数据
const getPluginsOverview = async () => {
  await pluginStore.getPluginsOverview();
};

// 处理文件更新
const handleFileUpdated = () => {
  // 重新获取插件概览数据
  pluginStore.getPluginsOverview();
};

// 页面加载时获取插件目录路径
onMounted(() => {
  getPluginsOverview();
});
</script>

<style scoped lang="scss">
// 变量定义
$primary-color: #409eff;
$success-color: #67c23a;
$danger-color: #f56c6c;
$warning-color: #e6a23c;
$text-primary: #303133;
$text-secondary: #606266;
$text-light: #909399;
$border-radius: 12px;
$border-radius-small: 10px;
$border-radius-mini: 4px;
$box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);
$box-shadow-hover: 0 4px 16px 0 rgba(0, 0, 0, 0.12);
$transition: all 0.3s ease;

.plugins-card {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  margin: 0;
  overflow: auto;

  &.mobile {
    padding: 10px;
  }

  h1 {
    color: var(--el-text-color-primary);
    font-size: 18px;
  }

  // 插件概览
  .plugins-overview {
    :deep(.el-card__body) {
      display: flex;
      flex: 1;
    }
    .el-row {
      .el-col {
        margin-bottom: 10px;
      }
    }
    .overview-card {
      border-radius: $border-radius;
      overflow: hidden;
      transition: $transition;
      box-shadow: $box-shadow;
      box-sizing: border-box;
      height: 120px;
      &:hover {
        transform: translateY(-5px);
        box-shadow: $box-shadow-hover;
      }

      .overview-content {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        width: 100%;

        // 左边：图标和标题
        .left-content {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          gap: 16px;

          // 响应式调整
          .mobile & {
            gap: 12px;
          }

          .overview-icon {
            font-size: 48px;
            color: $primary-color;

            // 响应式调整
            .mobile & {
              font-size: 36px;
            }
          }

          .text-content {
            display: flex;
            flex-direction: column;

            .overview-title {
              font-size: 18px;
              font-weight: 600;
              color: $text-primary;
              margin: 0;

              // 响应式调整
              .mobile & {
                font-size: 16px;
              }
            }

            .overview-desc {
              font-size: 14px;
              color: $text-light;
              margin: 4px 0 0 0;
              // 响应式调整
              .mobile & {
                font-size: 12px;
              }
            }
          }
        }

        // 右边：数量
        .right-content {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          flex-shrink: 0;
          .overview-count {
            font-size: 36px;
            font-weight: bold;
            color: $primary-color;
            margin: 0;

            // 响应式调整
            .mobile & {
              font-size: 28px;
            }
          }
        }
      }
    }
  }

  .file-manager-container {
    width: 100%;
    height: 100%;
    font-size: 0.8rem;
  }

  .no-selection {
    text-align: center;
    padding: 100px;
    color: #999;
    font-size: 16px;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--el-fill-color-light);

    // 响应式调整
    .mobile & {
      padding: 50px;
    }
  }

  // 响应式设计
  &.mobile {
    padding: 10px;

    .plugins-overview {
      .overview-card {
        max-height: 60px;
        padding: 0;
        :deep(.el-card__body) {
          padding: 10px;
        }
        .left-content {
          gap: 5px;
          .overview-icon {
            font-size: 30px;
          }
          .text-content {
            .overview-title {
              font-size: 16px;
            }
            .overview-desc {
              font-size: 12px;
            }
          }
        }

        .right-content {
          .overview-count {
            font-size: 24px;
          }
        }

        .overview-content {
          padding: 0;
        }
      }
    }
  }
}
</style>
