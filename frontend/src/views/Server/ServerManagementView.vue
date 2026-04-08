<template>
  <div class="server-card" :class="{ mobile: isMobile }">
    <!-- 服务器概览 -->
    <div class="server-overview">
      <el-row :gutter="10">
        <el-col :xs="12" :sm="12" :md="8" :lg="8" :xl="8">
          <el-card class="overview-card">
            <div class="overview-content">
              <div class="left-content">
                <div class="overview-icon">
                  <Icon class="icon-size" icon="mdi:chart-line" />
                </div>
                <div class="text-content">
                  <h3 class="overview-title">已部署</h3>
                  <p class="overview-desc">服务器</p>
                </div>
              </div>
              <div class="right-content">
                <p class="overview-count">
                  {{
                    serverStore.servers.map((x) => x.isServer).filter((x) => x)
                      .length
                  }}
                </p>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="12" :md="8" :lg="8" :xl="8">
          <el-card class="overview-card">
            <div class="overview-content">
              <div class="left-content">
                <div class="overview-icon">
                  <Icon class="icon-size" icon="mdi:folder" />
                </div>
                <div class="text-content">
                  <h3 class="overview-title">文件</h3>
                  <p class="overview-desc">占用</p>
                </div>
              </div>
              <div class="right-content">
                <p class="overview-count">{{ serverStore.totalFileSizeGB }}G</p>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
          <el-card class="overview-card deploy-card">
            <div class="overview-content deploy-content">
              <div class="left-content">
                <div class="text-content">
                  <h3 class="overview-title">部署新服务器</h3>
                  <p class="overview-desc">规则自动命名server01,server02...</p>
                </div>
              </div>
              <div class="right-content">
                <el-button
                  type="primary"
                  size="large"
                  @click="showDeployDialog = true"
                >
                  部署服务器
                </el-button>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div class="server-header">
      <el-icon>
        <Icon icon="mdi:folder-multiple" />
      </el-icon>
      <span>服务器文件</span>
      <div style="margin-left: auto; display: flex">
        <el-button size="small" text @click="showDeployConsole = true">
          <template #icon>
            <Icon icon="mdi:monitor" />
          </template>
          部署控制台
        </el-button>
        <!-- <el-button text size="small" @click="refreshServers">
          <template #icon>
            <Icon icon="mdi:refresh" />
          </template>
          刷新
        </el-button> -->
      </div>
    </div>
    <!-- 服务器列表 -->
    <ServerManager
      v-loading="serverStore.loading"
      element-loading-text="加载中..."
      v-if="serverStore.servers.length > 0"
      :servers="serverStore.servers"
      :current-server="currentServer"
      :initial-path="currentServer?.path || ''"
      :server-name="currentServer?.name || ''"
      :initial-files="currentServer?.files || []"
      @server-change="handleServerChange"
      @deploy-to-directory="showDeployToDirectoryDialog"
      @navigate-to-plugins="navigateToPlugins"
    />
    <div v-else class="no-servers">
      <el-empty description="暂无服务器" />
    </div>

    <!-- 部署服务器对话框 -->
    <DeployServerDialog
      v-model:visible="showDeployDialog"
      :server-count="serverStore.serverCount"
      @deploy-success="handleDeploySuccess"
    />

    <!-- 部署到指定目录对话框 -->
    <DeployServerDialog
      v-model:visible="showDeployToDirectoryDialogVisible"
      :is-deploy-to-directory="true"
      :deploy-to-directory-name="deployToDirectoryName"
      :is-existing-server="isExistingServer"
      @deploy-success="handleDeploySuccess"
    />

    <!-- 部署控制台对话框 -->
    <DeployConsoleDialog v-model:visible="showDeployConsole" />

    <!-- 插件管理对话框 -->
    <el-dialog
      v-model="showPluginsDialog"
      fullscreen
      :title="`插件管理 - ${currentServerName}`"
      destroy-on-close
      class="fullscreen-dialog"
    >
      <template #header>
        <!-- 返回上一页 -->
        <el-page-header @back="showPluginsDialog = false">
          <template #content>
            <span>
              当前服务器 -
              {{ currentServerName }}
            </span>
          </template>
        </el-page-header>
      </template>
      <div class="dialog-content">
        <ServerPluginsView :server-name="currentServerName" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import {
  ref,
  inject,
  provide,
  defineAsyncComponent,
  computed,
  onMounted,
} from "vue";
import { Icon } from "@iconify/vue";
import { useServerStore } from "@/stores/server";

const Swal = inject("$swal");
const isMobile = inject("isMobile");

const DeployServerDialog = defineAsyncComponent(
  () => import("@/components/deploy/DeployServerDialog.vue"),
);
const DeployConsoleDialog = defineAsyncComponent(
  () => import("@/components/deploy/DeployConsoleDialog.vue"),
);
const ServerPluginsView = defineAsyncComponent(
  () => import("./ServerPluginsView.vue"),
);
const ServerManager = defineAsyncComponent(
  () => import("@/components/server-manager/ServerManager.vue"),
);

const serverStore = useServerStore();

const currentServer = computed(() => {
  if (!serverStore.activeServerIndex && serverStore.servers.length > 0) {
    // 如果没有激活的服务器，默认选择第一个
    serverStore.activeServerIndex = serverStore.servers[0].name;
  }
  return (
    serverStore.servers.find(
      (server) => server.name === serverStore.activeServerIndex,
    ) || null
  );
});

const showDeployDialog = ref(false);
const showDeployToDirectoryDialogVisible = ref(false);
const showDeployConsole = ref(false);
const showPluginsDialog = ref(false);
const currentServerName = ref(null);
const deployToDirectoryName = ref("");
const isExistingServer = ref(false);

provide("showDeployConsole", showDeployConsole);

const handleDeploySuccess = async () => {
  await serverStore.getServers(basePath.value);
  Swal.fire({
    title: "成功",
    text: "服务器列表已更新",
    icon: "success",
    confirmButtonText: "确定",
    timer: 1500,
    showConfirmButton: false,
  });
};

// const refreshServers = async () => {
//   await serverStore.getServers(basePath.value);
//   Swal.fire({
//     title: "成功",
//     text: "服务器列表已刷新",
//     icon: "success",
//     confirmButtonText: "确定",
//     timer: 1500,
//     showConfirmButton: false,
//   });
// };

const backendConfig = inject("backendConfig");
const basePath = ref(backendConfig?.serverPath);

const handleServerChange = async (val) => {
  if (val === undefined || val === null || val === "") return;
  serverStore.activeServerIndex = val;
  // 加载选中服务器的文件，而不是basePath的文件
  await serverStore.loadServerFiles(val);
};

const showDeployToDirectoryDialog = (directoryName) => {
  deployToDirectoryName.value = directoryName;
  const server = serverStore.servers.find((s) => s.name === directoryName);
  isExistingServer.value = server ? server.isServer : false;
  showDeployToDirectoryDialogVisible.value = true;
};

const navigateToPlugins = (serverName) => {
  currentServerName.value = serverName;
  showPluginsDialog.value = true;
};

const getServers = async () => {
  try {
    if (!basePath.value) return;
    console.log("获取服务器列表...", basePath.value);
    await serverStore.getServers(basePath.value);
    // 服务器列表加载完成后，如果有服务器，加载第一个服务器的文件
    if (serverStore.servers.length > 0) {
      const firstServer = serverStore.servers[0];
      serverStore.activeServerIndex = firstServer.name;
      await serverStore.loadServerFiles(firstServer.name);
    }
  } catch (error) {
    console.error("获取服务器列表失败:", error);
    Swal.fire({
      title: "错误",
      text: "获取服务器列表失败",
      icon: "error",
      confirmButtonText: "确定",
    });
  }
};

onMounted(() => {
  getServers();
});
</script>

<style scoped lang="scss">
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

.server-card {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow: auto;
  position: relative;

  .server-overview {
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
      overflow: auto;
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

        .left-content {
          display: flex;
          align-items: center;
          gap: 16px;
          .mobile & {
            gap: 12px;
          }

          .overview-icon {
            font-size: 48px;
            color: $primary-color;
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
              .mobile & {
                font-size: 16px;
              }
            }

            .overview-desc {
              font-size: 14px;
              color: $text-light;
              margin: 4px 0 0 0;
              .mobile & {
                font-size: 12px;
              }
            }
          }
        }

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
            .mobile & {
              font-size: 28px;
            }
          }
        }
      }
    }
  }

  &.mobile {
    padding: 10px;

    .server-overview {
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

  .server-header {
    display: flex;
    background-color: #f5f7fa;
    justify-content: space-between;
    align-items: center;
    gap: 5px;
    font-size: 16px;
    font-weight: 600;
    color: $text-primary;
    margin: 0 0 5px 0;
    padding: 5px 16px;
    border-radius: 8px;
    position: sticky;
    top: 0;
    z-index: 99;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .no-servers {
    margin: 60px 0;
    text-align: center;
  }
}

:deep(.fullscreen-dialog) {
  overflow: hidden !important;
}

:deep(.fullscreen-dialog .el-dialog__body) {
  padding: 0 !important;
  overflow: hidden !important;
  height: calc(100% - 41px) !important;
  box-sizing: border-box;
}

.dialog-content {
  width: 100%;
  height: 100%;
}
</style>
