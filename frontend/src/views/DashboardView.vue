<template>
  <div class="dashboard-view">
    <!-- 状态概览卡片 -->
    <el-row :gutter="24" class="status-cards">
      <!-- 服务器文件卡片 -->
      <el-col :xs="24" :sm="12" :md="6">
        <el-card
          :class="{
            'status-deploying': deployStore.deploying,
          }"
          :body-style="{ padding: '20px' }"
        >
          <template #header>
            <div class="card-header">
              <el-icon style="margin-right: 8px; font-size: 18px">
                <Icon icon="mdi:server" />
              </el-icon>
              <span>服务器</span>
            </div>
          </template>
          <div class="card-content">
            <div class="status-row">
              <el-tag
                size="large"
                :type="
                  deployStore.deploying
                    ? 'warning'
                    : serverStatus.serverExists
                      ? 'success'
                      : 'danger'
                "
                style="margin-right: 10px"
              >
                {{
                  deployStore.deploying
                    ? "部署中..."
                    : serverStatus.serverExists
                      ? "已部署"
                      : "未部署"
                }}
              </el-tag>
              <el-tag size="small" type="info">
                数量: {{ serverCount }}
              </el-tag>
            </div>
            <div class="card-actions">
              <el-button
                type="primary"
                @click="viewServerFiles"
                style="width: 100%"
              >
                <Icon
                  icon="mdi:file-document-outline"
                  style="margin-right: 5px"
                />
                查看服务器文件
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 全部实例卡片 -->
      <el-col :xs="24" :sm="12" :md="6">
        <el-card :body-style="{ padding: '20px' }">
          <template #header>
            <div class="card-header">
              <el-icon style="margin-right: 8px; font-size: 18px">
                <Icon icon="mdi:format-list-bulleted" />
              </el-icon>
              <span>全部实例</span>
            </div>
          </template>
          <div class="card-content">
            <div class="status-row">
              <p style="font-size: 24px; font-weight: bold; margin: 0">
                {{ totalInstancesCount }} 个
              </p>
            </div>
            <div class="card-actions">
              <el-button
                type="primary"
                @click="$router.push('/instances')"
                :disabled="serverStatus.allInstances === 0 || serverCount === 0"
                style="width: 100%"
              >
                <Icon
                  icon="mdi:plus-circle-outline"
                  style="margin-right: 5px"
                />
                {{
                  serverStatus.allInstances === 0 || serverCount === 0
                    ? "请先部署服务器"
                    : "添加实例"
                }}
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 运行实例卡片 -->
      <el-col :xs="24" :sm="12" :md="6">
        <el-card :body-style="{ padding: '20px' }">
          <template #header>
            <div class="card-header">
              <el-icon style="margin-right: 8px; font-size: 18px">
                <Icon icon="mdi:rocket" />
              </el-icon>
              <span>运行实例</span>
            </div>
          </template>
          <div class="card-content">
            <div class="status-row">
              <p style="font-size: 24px; font-weight: bold; margin: 0">
                {{ runningInstancesCount }} 个
              </p>
            </div>
            <div class="card-actions">
              <el-button
                type="primary"
                @click="$router.push('/instances')"
                :disabled="serverCount === 0"
                style="width: 100%"
              >
                <Icon icon="mdi:server-outline" style="margin-right: 5px" />
                {{ serverCount === 0 ? "请先部署服务器" : "管理实例" }}
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 插件总数卡片 -->
      <el-col :xs="24" :sm="12" :md="6">
        <el-card :body-style="{ padding: '20px' }">
          <template #header>
            <div class="card-header">
              <el-icon style="margin-right: 8px; font-size: 18px">
                <Icon icon="mdi:puzzle" />
              </el-icon>
              <span>插件数量</span>
            </div>
          </template>
          <div class="card-content">
            <div class="status-row">
              <p style="font-size: 24px; font-weight: bold; margin: 0">
                {{ serverStatus.installedPlugins }} 个
              </p>
            </div>
            <div class="card-actions">
              <el-button
                type="primary"
                @click="$router.push('/plugins')"
                style="width: 100%"
              >
                <Icon icon="mdi:puzzle-outline" style="margin-right: 5px" />
                管理插件
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <div class="instances-header">
      <el-icon><Icon icon="mdi:chart-pie" /></el-icon>
      实例列表
      <div class="header-buttons">
        <el-button size="small" text @click="handleRefresh">
          <template #icon>
            <Icon icon="mdi:refresh" />
          </template>
          刷新状态
        </el-button>
      </div>
    </div>
    <!-- 实例列表 -->
    <InstanceList
      v-loading="loading"
      element-loading-text="加载中..."
      :instances="serverInstances"
      :enable-edit="false"
      @refresh="refreshInstances"
      @start="startInstance"
      @stop="stopInstance"
      @delete="deleteInstance"
      @restart="restartInstance"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, inject } from "vue";
import { useRouter } from "vue-router";
import { useDeployStore } from "../stores/deploy";
import { useServerStore } from "@/stores/server";
import InstanceList from "@/components/instance/InstanceList.vue";
import { useInstanceStore } from "@/stores/instance";
import { Icon } from "@iconify/vue";

// 注入 Swal 实例
const Swal = inject("$swal");

const deployStore = useDeployStore();
const instanceStore = useInstanceStore();
const serverStore = useServerStore();
const router = useRouter();

// 从instanceStore获取实例相关状态
const serverCount = computed(() => instanceStore.serverCount);
const serverInstances = computed(() => instanceStore.serverInstances);
const runningInstancesCount = computed(
  () => instanceStore.runningInstancesCount,
);
const totalInstancesCount = computed(() => instanceStore.totalInstancesCount);

// 计算属性：服务器状态
const serverStatus = computed(() => serverStore.serverStatus);

// 获取服务器状态
const getServerStatus = async () => {
  try {
    await serverStore.getServerStatus();
    await instanceStore.getServerCount();
    await instanceStore.getServerInstances();
  } catch (error) {
    console.error("获取服务器状态失败:", error);
  }
};

// 查看服务器文件
const viewServerFiles = () => {
  router.push("/servers");
};

// 存储事件监听器引用
const deployStatusUpdatedHandler = async (event) => {
  // 只有当部署状态为 completed 时才更新服务器状态
  if (event.detail.status === "completed") {
    console.log("部署完成，更新服务器状态");
    await getServerStatus();
    console.log("服务器状态更新完成:", serverStatus);
  }
};

const layoutRefreshHandler = () => {
  console.log("刷新状态");
  getServerStatus();
};

// 处理实例列表
const loading = ref(false);

const handleRefresh = async () => {
  await refreshInstances();
};
// 刷新实例状态
const refreshInstances = async () => {
  loading.value = true;
  try {
    await instanceStore.refreshInstances();
  } catch (error) {
    console.error("刷新实例状态失败:", error);
  } finally {
    loading.value = false;
  }
};

// 页面加载时获取状态
onMounted(async () => {
  await getServerStatus();
  window.addEventListener("deploy:status-updated", deployStatusUpdatedHandler);
  window.addEventListener("layout:refresh", layoutRefreshHandler);
});

// 组件卸载时移除事件监听器
onUnmounted(() => {
  window.removeEventListener(
    "deploy:status-updated",
    deployStatusUpdatedHandler,
  );
  window.removeEventListener("layout:refresh", layoutRefreshHandler);
});

// 删除实例
const deleteInstance = async (name) => {
  try {
    const result = await Swal.fire({
      title: "确认删除",
      text: `确定要删除实例 ${name} 吗？`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "确定",
      cancelButtonText: "取消",
    });

    if (result.isConfirmed) {
      await instanceStore.deleteInstance(name);
      Swal.fire({
        title: "删除成功",
        text: `实例 ${name} 已删除`,
        icon: "success",
        confirmButtonText: "确定",
      });
    }
  } catch (error) {
    console.error("删除实例失败:", error);
  }
};

// 启动实例
const startInstance = async (instance) => {
  loading.value = true;
  try {
    console.log("启动实例:", instance.name);
    console.log("启动实例参数:", instance.extraParams);
    // 传递启动参数
    await instanceStore.startInstance(instance);

    // 检查实例是否真的在运行
    const updatedInstance = instanceStore.serverInstances.find(
      (i) => i.name === instance.name,
    );
    if (updatedInstance && updatedInstance.status === "running") {
      Swal.fire({
        title: "启动成功",
        text: `实例 ${instance.name} 已启动`,
        icon: "success",
        confirmButtonText: "确定",
      });
    } else {
      Swal.fire({
        title: "启动失败",
        text: `实例 ${instance.name} 启动后立即停止`,
        icon: "warning",
        confirmButtonText: "确定",
      });
    }
  } catch (error) {
    console.error("启动实例失败:", error);
  } finally {
    loading.value = false;
  }
};

// 重启实例
const restartInstance = async (instance) => {
  loading.value = true;
  try {
    await instanceStore.restartInstance(instance);
    Swal.fire({
      title: "重启成功",
      text: `实例 ${instance.name} 已重启`,
      icon: "success",
      confirmButtonText: "确定",
    });
  } catch (error) {
    console.error("重启实例失败:", error);
  } finally {
    loading.value = false;
  }
};

// 停止实例
const stopInstance = async (instance) => {
  loading.value = true;
  try {
    console.log("停止实例:", instance);
    await instanceStore.stopInstance(instance);
    Swal.fire({
      title: "停止成功",
      text: `实例 ${instance.name} 已停止`,
      icon: "success",
      confirmButtonText: "确定",
    });
  } catch (error) {
    console.error("停止实例失败:", error);
    Swal.fire({
      title: "错误",
      text: "停止实例失败",
      icon: "error",
      confirmButtonText: "确定",
    });
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped lang="scss">
.dashboard-view {
  padding: 20px;
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-x: hidden;
  @media (max-width: 768px) {
    padding: 10px;
  }

  .instances-header {
    display: flex;
    background-color: #f5f7fa;
    align-items: center;
    gap: 5px;
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 5px 0;
    padding: 5px 16px;
    border-radius: 8px;
    position: sticky;
    top: 0;
    z-index: 10;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    .header-buttons {
      margin-left: auto;
    }
  }
}
.status-cards {
  // margin-bottom: 24px;
  // gap: 10px;
  // :deep(.el-col) {
  //   padding-right: 0 !important;
  //   padding-left: 0 !important;
  // }
  // 服务器概览
  .el-col {
    // 响应式调整
    margin-bottom: 10px;
  }

  .el-card {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .el-button {
      margin-left: auto;
      white-space: nowrap;
    }
  }

  :deep(.el-card__body) {
    display: flex;
    flex-direction: column;
    flex: 1;
  }
}

.status-deploying {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(243, 156, 18, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(243, 156, 18, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(243, 156, 18, 0);
  }
}

/* 状态行样式 */
.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

/* 卡片内容样式 */
.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 卡片按钮样式 */
.card-actions {
  margin-top: auto;
  padding-top: 20px;
}
</style>
