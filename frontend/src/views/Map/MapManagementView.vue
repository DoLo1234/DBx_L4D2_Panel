<template>
  <div class="maps-card" :class="{ mobile: isMobile }">
    <!-- 地图概览卡片 -->
    <div class="maps-overview">
      <el-row :gutter="20">
        <el-col :xs="12" :sm="12" :md="12" :lg="6" :xl="6">
          <el-card class="overview-card">
            <div class="overview-content">
              <div class="left-content">
                <div class="overview-icon">
                  <Icon class="icon-size" icon="mdi:map" />
                </div>
                <div class="text-content">
                  <h3 class="overview-title">地图总数</h3>
                  <p class="overview-desc">所有地图</p>
                </div>
              </div>
              <div class="right-content">
                <p class="overview-count">{{ mapStore.totalMapsCount }}</p>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="12" :md="12" :lg="6" :xl="6">
          <el-card class="overview-card">
            <div class="overview-content">
              <div class="left-content">
                <div class="overview-icon">
                  <Icon class="icon-size" icon="mdi:check-circle" />
                </div>
                <div class="text-content">
                  <h3 class="overview-title">已分配</h3>
                  <p class="overview-desc">已分配地图</p>
                </div>
              </div>
              <div class="right-content">
                <p class="overview-count">{{ mapStore.assignedMapsCount }}</p>
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
                  <p class="overview-desc">未分配地图</p>
                </div>
              </div>
              <div class="right-content">
                <p class="overview-count">{{ mapStore.unassignedMapsCount }}</p>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="12" :md="12" :lg="6" :xl="6">
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
                <p class="overview-count">{{ mapStore.mapDirectorySize }}</p>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 地图目录文件管理 -->
    <MapManager
      v-if="mapStore.mapDirectoryPath"
      :initial-path="mapStore.mapDirectoryPath"
      uploadTitle="上传地图"
      :show-actions="true"
      :upload-type="false"
      @fileUpdated="handleFileUpdated"
      @activeServerName="handleActiveServerName"
    />
  </div>
</template>

<script setup>
import { onMounted, inject, ref } from "vue";
import { useMapStore } from "@/stores/map";
import { useInstanceStore } from "@/stores/instance";
import MapManager from "@/components/map-manager/MapManager.vue";
import { Icon } from "@iconify/vue";

// 注入 Swal 实例
const Swal = inject("$swal");

const isMobile = inject("isMobile");

// 使用地图Store
const mapStore = useMapStore();
// 使用实例Store
const instanceStore = useInstanceStore();

// 定义事件
// const emit = defineEmits(["fileUpdated"]);

// 处理文件更新
const handleFileUpdated = () => {
  // 文件更新后触发事件
  // emit("fileUpdated");
  // 可以在这里添加更新统计数据的逻辑
  mapStore.getMapsOverview(selectedServerName.value);
};

const selectedServerName = ref("");

// 处理服务器名称变化
const handleActiveServerName = (serverName) => {
  console.log("服务器名称变化:", serverName);
  // 可以在这里添加更新统计数据的逻辑
  mapStore.getMapsOverview(serverName);
  selectedServerName.value = serverName;
};

// 页面加载时获取地图目录路径
onMounted(() => {
  // 获取地图统计数据
  // mapStore.getMapsOverview(handleActiveServerName);
  // 获取已部署服务器列表
  instanceStore.getDeployedServers();
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

.maps-card {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow: auto;

  &.mobile {
    padding: 10px;
  }

  h1 {
    color: var(--el-text-color-primary);
    font-size: 20px;
  }

  // 概览卡片
  .maps-overview {
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
            flex-shrink: 0;

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

  // 响应式设计
  &.mobile {
    padding: 10px;

    .maps-overview {
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
