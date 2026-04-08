<template>
  <div class="server-instances-container" :class="{ mobile: isMobile }">
    <!-- 实例概览 -->
    <div class="instances-overview">
      <el-row :gutter="20">
        <el-col :xs="12" :sm="12" :md="12" :lg="6" :xl="6">
          <el-card class="overview-card">
            <div class="overview-content">
              <div class="left-content">
                <div class="overview-icon">
                  <Icon class="icon-size" icon="mdi:monitor" />
                </div>
                <div class="text-content">
                  <h3 class="overview-title">可选择</h3>
                  <p class="overview-desc">部署数量</p>
                </div>
              </div>
              <div class="right-content">
                <p class="overview-count">{{ instanceStore.serverCount }}</p>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="12" :md="12" :lg="6" :xl="6">
          <el-card class="overview-card">
            <div class="overview-content">
              <div class="left-content">
                <div class="overview-icon">
                  <Icon class="icon-size" icon="mdi:play" />
                </div>
                <div class="text-content">
                  <h3 class="overview-title">运行中</h3>
                  <p class="overview-desc">活跃实例</p>
                </div>
              </div>
              <div class="right-content">
                <p class="overview-count">
                  {{ instanceStore.runningInstancesCount }}
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
                  <Icon class="icon-size" icon="mdi:pause" />
                </div>
                <div class="text-content">
                  <h3 class="overview-title">已停止</h3>
                  <p class="overview-desc">非活跃实例</p>
                </div>
              </div>
              <div class="right-content">
                <p class="overview-count">
                  {{ instanceStore.stoppedInstancesCount }}
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
                  <Icon class="icon-size" icon="mdi:server-network" />
                </div>
                <div class="text-content">
                  <h3 class="overview-title">总实例</h3>
                  <p class="overview-desc">服务器实例</p>
                </div>
              </div>
              <div class="right-content">
                <p class="overview-count">
                  {{ instanceStore.totalInstancesCount }}
                </p>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div class="instances-header">
      <el-icon><Icon icon="mdi:chart-pie" /></el-icon>
      实例列表
      <div class="header-buttons">
        <el-button
          v-if="instanceStore.deployedServers.length"
          size="small"
          text
          @click="handleAddInstance"
        >
          <template #icon>
            <Icon icon="mdi:plus" />
          </template>
          添加实例
        </el-button>
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
      v-loading="instanceStore.loading"
      element-loading-text="加载中..."
      :instances="instanceStore.serverInstances"
      :deployed-servers="instanceStore.deployedServers"
      :existing-instances="instanceStore.serverInstances"
      :enable-edit="true"
      @refresh="refreshInstances"
      @instance-click="handleInstanceClick"
      @start="startInstance"
      @stop="stopInstance"
      @delete="deleteInstance"
      @restart="restartInstance"
    />

    <!-- 实例表单弹窗（用于添加和编辑） -->
    <InstanceFormDialog
      v-model="showInstanceDialog"
      :deployed-servers="instanceStore.deployedServers"
      :existing-instances="instanceStore.serverInstances"
      v-model:isEdit="isEditMode"
      v-model:formData="editData"
      @save="handleFormSave"
      @cancel="handleFormCancel"
    />
  </div>
</template>

<script setup>
import { onMounted, inject, ref } from "vue";
import { useInstanceStore } from "@/stores/instance";
import { Icon } from "@iconify/vue";
import InstanceList from "../components/instance/InstanceList.vue";
import InstanceFormDialog from "../components/instance/InstanceFormDialog.vue";

// 注入 Swal 实例
const Swal = inject("$swal");
const isMobile = inject("isMobile");

// 实例Store
const instanceStore = useInstanceStore();

// 显示实例弹窗（用于添加和编辑）
const showInstanceDialog = ref(false);
// 是否为编辑模式
const isEditMode = ref(false);
// 编辑数据
const editData = ref({});

// 刷新实例状态
const refreshInstances = async () => {
  try {
    await instanceStore.refreshInstances();
  } catch (error) {
    console.error("刷新实例状态失败:", error);
  }
};

// 处理刷新按钮点击
const handleRefresh = () => {
  refreshInstances();
};

// 处理添加实例按钮点击
const handleAddInstance = () => {
  console.log("添加实例按钮点击");
  // 重置表单数据
  isEditMode.value = false;
  // 重置表单数据
  // editData.value = {};
  showInstanceDialog.value = true;
};

// 处理表单保存
const handleFormSave = async (formData) => {
  try {
    const { isEdit, ...instanceData } = formData;

    if (isEdit) {
      // 编辑实例
      console.log("编辑实例数据:", instanceData);
      const response = await instanceStore.editInstance(
        instanceData.name,
        instanceData,
      );
      console.log("编辑实例响应:", response);
      // 显示成功提示
      Swal.fire({
        title: "成功",
        text: response.message,
        icon: "success",
        confirmButtonText: "确定",
      });
    } else {
      // 添加实例
      // 创建实例配置
      const instanceConfig = {
        serverId: instanceData.serverId,
        name: instanceData.name,
        port: instanceData.port,
        hostName: instanceData.hostName,
        maxPlayers: instanceData.maxPlayers,
        startMap: instanceData.startMap,
        insecure: instanceData.insecure,
        gameMode: instanceData.gameMode,
        tickRate: instanceData.tickRate,
        extraParams: instanceData.extraParams,
        runInfo: instanceData.runInfo,
      };

      // 调用API添加实例
      const response = await instanceStore.addInstance(instanceConfig);
      console.log("添加实例响应:", response);
      // 显示成功提示
      Swal.fire({
        title: "成功",
        text: response.message,
        icon: "success",
        confirmButtonText: "确定",
      });
    }

    // 刷新实例列表
    await instanceStore.getServerInstances();
  } catch (error) {
    console.error("操作实例失败:", error);
  }
};

// 处理表单取消
const handleFormCancel = () => {
  // 重置表单数据
  editData.value = {};
  // 关闭弹窗
  showInstanceDialog.value = false;
};

// 处理实例点击事件
const handleInstanceClick = (instance) => {
  if (instance) {
    // 设置编辑数据
    editData.value = { ...instance };
    // 设置为编辑模式
    isEditMode.value = true;
    // 打开弹窗
    showInstanceDialog.value = true;
  }
};

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
  }
};

// 重启实例
const restartInstance = async (instance) => {
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
  }
};

// 停止实例
const stopInstance = async (instance) => {
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
  }
};

const loadAllInstances = async () => {
  try {
    await instanceStore.loadAllInstances();
  } catch (error) {
    console.error("加载所有实例数据失败:", error);
  }
};

// 页面加载时获取状态
onMounted(async () => {
  await loadAllInstances();
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

// 容器样式
.server-instances-container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: auto;
  // 页面标题
  .page-header {
    padding: 10px;
    color: var(--el-text-color-primary);
    font-size: 18px;
  }

  // 概览卡片
  .instances-overview {
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

    .instances-overview {
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

    .instances-list {
      .instances-panel {
        .instance-card {
          .instance-header {
            flex-wrap: wrap;
            gap: 8px;
          }

          .instance-actions {
            flex-direction: column;
            gap: 10px;

            .el-button {
              width: 100%;
            }
          }
        }
      }
    }
  }

  .instances-header {
    display: flex;
    background-color: #f5f7fa;
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
    z-index: 10;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    .header-buttons {
      margin-left: auto;
    }
  }

  // 添加实例表单
  .add-instance-form {
    .add-instance-form-content {
      padding: 20px;
      background-color: #f9fafb;
      border-radius: 8px;
    }
  }

  // 实例列表
  .instances-list {
    flex: 1;

    // 实例面板
    .instances-panel {
      overflow: hidden;
      box-shadow: $box-shadow;

      // 实例卡片
      .instance-card {
        border-radius: $border-radius-small;
        overflow: hidden;
        transition: $transition;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        }

        &.instance-running {
          border-left: 4px solid $success-color;
        }

        // 实例头部
        .instance-header {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .el-tag {
            white-space: nowrap;
          }
        }

        // 实例详情
        .instance-details {
          margin: 0;
        }

        // 实例配置
        .instance-config {
          margin: 16px 0;
          padding: 10px;
          background-color: #f5f7fa;
          border-radius: $border-radius-mini;
        }

        // 实例操作
        .instance-actions {
          display: flex;
          justify-content: space-between;
          margin-top: 16px;

          .el-button {
            width: 32%;
          }
        }
      }

      // 无实例提示
      .no-instances {
        text-align: center;
        padding: 40px 0;
      }
    }
  }
}

// 卡片头部
.card-header {
  display: flex;
  justify-content: start;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: $text-primary;

  .el-button {
    margin-left: auto;
  }
}
</style>
