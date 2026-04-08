<template>
  <el-dialog
    v-model="visible"
    :fullscreen="isMobile"
    width="80%"
    :close-on-click-modal="false"
  >
    <template #header>
      <div class="dialog-header">
        <span>部署控制台</span>
        <div v-if="deployStore.deploying" class="loading">部署中...</div>
      </div>
    </template>
    <el-scrollbar
      ref="scrollbarRef"
      class="console-scrollbar"
      :class="{ 'console-scrollbar-mobile': isMobile }"
    >
      <div class="console-content">
        <div
          v-for="(line, index) in deployStore.consoleLogs"
          :key="index"
          class="console-line"
        >
          {{ line }}
        </div>
        <div v-if="deployStore.consoleLogs.length === 0" class="no-logs">
          等待部署开始...
        </div>
      </div>
    </el-scrollbar>
    <!-- 命令输入 -->
    <div class="console-input">
      <el-autocomplete
        v-model="commandInput"
        clearable
        placeholder="输入命令..."
        @keyup.enter="sendCommand"
        :fetch-suggestions="fetchSuggestions"
        @select="handleSelect"
        :disabled="!deployStore.deploying"
      >
        <template #default="{ item }">
          <span class="label">{{ item.label }}</span>
        </template>
        <template #append>
          <el-button @click="sendCommand" :disabled="!deployStore.deploying">
            发送
          </el-button>
        </template>
      </el-autocomplete>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button
          v-if="deployStore.deploying"
          type="danger"
          size="small"
          @click="cancelDeploy"
        >
          取消部署
        </el-button>
        <el-button type="info" size="small" @click="clearConsole">
          清空控制台
        </el-button>
        <el-button type="primary" size="small" @click="visible = false">
          关闭
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, inject, nextTick } from "vue";
import { useDeployStore } from "../../stores/deploy";
import { serverApi } from "../../api";

// 注入 Swal 实例
const Swal = inject("$swal");
const isMobile = ref(inject("isMobile"));

// 定义属性
const visible = defineModel("visible");

// 获取部署store
const deployStore = useDeployStore();

// 状态管理
const commandInput = ref("");
const scrollbarRef = ref(null);

// 监听对话框显示状态，当打开时获取最新部署状态
// watch(visible, async (newVisible) => {
//   if (newVisible) {
//     // 当对话框打开时，检查部署状态
//     await deployStore.checkDeployStatus();
//   }
// });

// 监听日志变化，自动滚动到底部
watch(
  () => deployStore.consoleLogs.length,
  async () => {
    // 等待DOM更新完成
    await nextTick();
    // 滚动到底部
    if (scrollbarRef.value) {
      scrollbarRef.value.wrapRef.scrollTop =
        scrollbarRef.value.wrapRef.scrollHeight;
    }
  },
);

// 取消部署
const cancelDeploy = async () => {
  try {
    await deployStore.cancelDeploy();
  } catch (error) {
    console.error("取消部署失败:", error);
    Swal.fire({
      title: "取消失败",
      text: "取消部署失败: " + error.message,
      icon: "error",
      confirmButtonText: "确定",
    });
  }
};

// 清空控制台
const clearConsole = () => {
  deployStore.consoleLogs = [];
};

// 发送命令
const sendCommand = async () => {
  if (!commandInput.value.trim()) return;

  try {
    // 发送命令到后端
    await serverApi.sendDeployCommand(commandInput.value);
    // 清空命令输入
    commandInput.value = "";
  } catch (error) {
    console.error("发送命令失败:", error);
    Swal.fire({
      title: "发送失败",
      text: "发送命令失败: " + error.message,
      icon: "error",
      confirmButtonText: "确定",
    });
  }
};

// 命令建议列表
const commandSuggestions = [
  {
    value: "force_install_dir",
    label: "force_install_dir <path> - 设置安装目录",
  },
  { value: "login", label: "login <username> <password> - 登录Steam账号" },
  { value: "app_update", label: "app_update 222860 - 更新Left 4 Dead 2服务器" },
  {
    value: "app_update 222860 validate",
    label: "app_update 222860 validate - 更新并验证服务器文件",
  },
  { value: "quit", label: "quit - 退出SteamCMD" },
];

// 获取命令建议
const fetchSuggestions = (queryString, callback) => {
  const filteredSuggestions = commandSuggestions.filter(
    (suggestion) => suggestion.value,
  );

  callback(filteredSuggestions);
};

// 处理命令选择
const handleSelect = (item) => {
  console.log("Selected:", item.value);
  // 再将选中的命令和之前的命令合并赋值给输入框
  commandInput.value = item.value;
};
</script>

<style scoped lang="scss">
// 控制台样式
.console-scrollbar {
  display: flex;
  flex: 1;
  height: 50vh;
  :deep(.el-scrollbar__wrap) {
    display: flex;
    flex: 1;
    .el-scrollbar__view {
      width: 100%;
    }
  }
  &.console-scrollbar-mobile {
    height: calc(100vh - 200px);
  }
}

.console-content {
  padding: 10px;
  width: 100%;
  font-family: "Courier New", Courier, monospace;
  font-size: 14px;
  line-height: 1.4;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.console-input {
  margin-top: 15px;
  display: flex;
  gap: 10px;

  .el-input {
    flex: 1;
  }
}

.dialog-header {
  display: flex;
  gap: 10px;
}

.console-line {
  margin-bottom: 4px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.no-logs {
  color: #909399;
  text-align: center;
  padding: 20px;
}

.loading {
  text-align: center;
  color: #409eff;
  font-weight: bold;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}
</style>
