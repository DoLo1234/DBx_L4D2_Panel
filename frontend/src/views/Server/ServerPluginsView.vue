<template>
  <div class="plugins-card">
    <!-- 插件穿梭框区域 -->
    <div v-if="serverName" class="transfer-container">
      <el-transfer
        :model-value="pluginStore.pluginIds"
        @change="handlePluginChange"
        :data="pluginStore.allPlugins"
        :titles="['可用插件', '已安装插件']"
        :button-texts="['卸载', '安装']"
        :filterable="true"
        filter-placeholder="搜索插件"
      />
    </div>
    <div v-else class="no-selection">请先选择一个服务器</div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, inject } from "vue";
import { usePluginStore } from "@/stores/plugin";

// 注入 Swal 实例
const Swal = inject("$swal");

const props = defineProps({
  serverName: {
    type: String,
    default: null,
  },
});

const isMobile = ref(inject("isMobile"));

// 使用插件Store
const pluginStore = usePluginStore();
// 加载插件数据
const loadPlugins = async () => {
  if (!props.serverName) return;

  try {
    console.log("加载插件数据: 服务器ID:", props.serverName);
    await pluginStore.loadPlugins(props.serverName);
  } catch (error) {
    console.error("加载插件数据失败:", error);
    Swal.fire({
      title: "错误",
      text: "加载插件数据失败",
      icon: "error",
      confirmButtonText: "确定",
    });
  }
};
// 处理插件变化
const handlePluginChange = async (value, direction, moveKeys) => {
  if (!props.serverName) return;

  // 保存当前状态，用于取消时恢复
  const originalTempPluginIds = [...pluginStore.pluginIds];

  try {
    // 检查当前实例是否正在运行
    const isRunning = await pluginStore.checkServerInstanceStatus(
      props.serverName,
    );
    if (isRunning) {
      Swal.fire({
        title: "警告",
        text: `当前${props.serverName}服务器有实例正在运行，请先停止所有${props.serverName}服务器的实例，再${direction === "right" ? "安装" : "卸载"}插件。`,
        icon: "warning",
        showCancelButton: false,
      });
      return;
    }
    // 提示是否确认安装
    const result = await Swal.fire({
      title: `确认${direction === "right" ? "安装" : "卸载"}${moveKeys.length}个插件`,
      html: `是否${direction === "right" ? "安装" : "卸载"}</br><span style="color: #409EFF;">${moveKeys.join("，</br>")}</span>？`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "确定",
      cancelButtonText: "取消",
    });
    if (!result.isConfirmed) {
      return;
    }

    // 执行插件操作
    const executePluginAction = async (pluginKey) => {
      try {
        const apiMethod =
          direction === "right"
            ? pluginStore.installPlugin
            : pluginStore.uninstallPlugin;
        const response = await apiMethod(pluginKey, props.serverName);
        return { success: response.success, error: response.message };
      } catch (error) {
        return {
          success: false,
          error: error || `${direction === "right" ? "安装" : "卸载"}失败`,
        };
      }
    };

    const results = [];
    for (const pluginKey of moveKeys) {
      const result = await executePluginAction(pluginKey);
      results.push({ plugin: pluginKey, ...result });
    }
    // 分类结果
    const successPlugins = results
      .filter((r) => r.success)
      .map((r) => r.plugin);
    const failedPlugins = results.filter((r) => !r.success);
    console.log("失败插件:", failedPlugins);
    // 刷新列表
    await loadPlugins();

    // 显示结果消息
    const actionText = direction === "right" ? "安装" : "卸载";
    const successText = `<span style="color: #67c23a;">成功${successPlugins.length}个插件</span>`;
    if (successPlugins.length > 0 && failedPlugins.length === 0) {
      Swal.fire({
        title: "成功",
        html: `${actionText}${successText}`,
        icon: "success",
        confirmButtonText: "确定",
      });
    } else if (failedPlugins.length > 0) {
      const errorMessages = failedPlugins
        .map(
          (item, index) =>
            `<span style="color: #f56c6c;">${index + 1}：${item.error}</span>`,
        )
        .join("<br>");
      if (successPlugins.length === 0) {
        Swal.fire({
          title: "失败",
          html: `${actionText}插件失败<br>${errorMessages}`,
          icon: "error",
          confirmButtonText: "确定",
        });
      } else {
        const failedText = `<span style="color: #f56c6c;">失败${failedPlugins.length}个插件</span>`;
        Swal.fire({
          title: "部分成功",
          html: `${actionText}${successText}，${failedText}<br>${errorMessages}`,
          icon: "warning",
          confirmButtonText: "确定",
        });
      }
    }
  } catch (error) {
    console.error("操作插件失败:", error);
    Swal.fire({
      title: "错误",
      html: `操作插件失败: <span style="color: #f56c6c;">${error.message || "未知错误"}</span>`,
      icon: "error",
      confirmButtonText: "确定",
    });
  }
};

// 监听服务器名变化，重新加载插件
watch(
  () => props.serverName,
  (newServerName) => {
    if (newServerName) {
      loadPlugins();
    }
  },
);

// 页面加载时加载插件数据
onMounted(() => {
  if (props.serverName) {
    loadPlugins();
  }
});
</script>

<style scoped lang="scss">
.plugins-card {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;

  .server-selection {
    margin-bottom: 10px;
    padding: 15px;
    background: var(--el-fill-color-light);
    border-radius: 12px;
    width: 100%;
    box-sizing: border-box;
    flex-shrink: 0;

    .server-form {
      width: 100%;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: flex-end;

      .el-form-item {
        margin-bottom: 0;
        margin-right: 0 !important;

        .el-select {
          width: 150px;
        }

        .el-button {
          width: auto;
        }
      }
    }

    .no-servers {
      color: #999;
      padding: 10px;
      text-align: center;
    }

    .loading-servers {
      color: #666;
      padding: 10px;
      text-align: center;
      font-size: 14px;
    }

    // 响应式调整
    @media (max-width: 768px) {
      .server-form {
        flex-direction: column;
        align-items: stretch;

        .el-form-item {
          width: 100%;
          min-width: unset;

          .el-select {
            width: 100%;
          }

          .el-button {
            width: auto;
          }
        }
      }
    }
  }

  .transfer-container {
    width: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    /* 使用样式穿透处理穿梭框大小 */
    :deep(.el-transfer) {
      width: 100%;
      height: 100%;
      display: flex;

      .el-transfer-panel {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
        border-radius: var(--el-card-border-radius) !important;

        .el-transfer-panel__body {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;

          .el-transfer-panel__list {
            flex: 1;
            overflow: auto;
          }

          .el-transfer-panel__filter {
            padding: 5px 10px;
          }
        }

        .el-transfer-panel__footer {
          display: flex;
          height: auto;
        }
      }

      .el-transfer__buttons {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 0 10px;
      }
    }

    // 响应式调整
    @media (max-width: 968px) {
      :deep(.el-transfer) {
        flex-direction: column;

        .el-transfer-panel {
          width: 100%;
          min-height: 200px;
        }

        .el-transfer__buttons {
          flex-direction: row;
          margin: 5px 0;

          .el-button {
            flex: 1;
          }
        }
      }
    }
  }

  .no-selection {
    text-align: center;
    color: #999;
    font-size: 16px;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;

    // 响应式调整
    @media (max-width: 768px) {
      padding: 50px;
    }
  }

  .no-plugins {
    text-align: center;
    padding: 40px;
    color: #666;
  }
}
</style>
