<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="80%"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <el-form
      :model="deployForm"
      @submit.prevent="handleDeploy"
      :rules="deployRules"
      ref="deployFormRef"
    >
      <el-form-item label="Steam 账号" prop="steamUser">
        <el-input
          v-model="deployForm.steamUser"
          placeholder="请输入Steam账户"
          :disabled="deploying"
          clearable
        />
      </el-form-item>
      <el-form-item label="Steam 密码" prop="steamPassword">
        <el-input
          type="password"
          v-model="deployForm.steamPassword"
          placeholder="请输入Steam密码"
          :disabled="deploying"
          clearable
        />
      </el-form-item>
      <el-form-item label="部署模式" prop="interactive">
        <el-switch
          v-model="deployForm.interactive"
          active-text="自动模式"
          inactive-text="交互模式"
          :disabled="deploying"
        />
        <el-tooltip
          content="交互模式：手动输入命令；自动模式：自动执行部署流程"
          placement="top"
        >
          <Icon class="info-icon" icon="mdi:help-circle" />
        </el-tooltip>
      </el-form-item>
      <el-alert
        title="Windows环境下可以直接部署，无需登录，使用匿名登录。"
        type="info"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />
      <el-form-item>
        <el-button
          type="primary"
          native-type="submit"
          :disabled="deploying"
          :loading="deploying"
        >
          {{
            deploying
              ? "部署中..."
              : isDeployToDirectory
                ? isExistingServer
                  ? "更新服务器"
                  : "部署服务器"
                : "开始部署"
          }}
        </el-button>
        <el-button @click="visible = false" :disabled="deploying">
          取消
        </el-button>
      </el-form-item>
    </el-form>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, inject } from "vue";
import { Icon } from "@iconify/vue";
import { useAuthStore } from "../../stores/auth";
import { useDeployStore } from "../../stores/deploy";

// 注入 Swal 实例
const Swal = inject("$swal");
// 注入部署控制台可见性状态
const showDeployConsole = inject("showDeployConsole");

// 定义属性
const props = defineProps({
  serverCount: {
    type: Number,
    default: 0,
  },
  isDeployToDirectory: {
    type: Boolean,
    default: false,
  },
  deployToDirectoryName: {
    type: String,
    default: "",
  },
  isExistingServer: {
    type: Boolean,
    default: false,
  },
});

// 定义双向绑定的visible属性
const visible = defineModel("visible");

// 定义事件
const emit = defineEmits(["deploy-success"]);

// 获取认证store
const authStore = useAuthStore();
// 获取部署store
const deployStore = useDeployStore();

// 状态管理
const deploying = ref(false);
const deployFormRef = ref(null);
const serverName = ref("");

// 部署状态配置
const deployStatusConfig = {
  completed: {
    title: "部署成功",
    icon: "success",
    getText: (serverName, isExistingServer) =>
      `服务器 ${serverName} 已${isExistingServer ? "更新" : "部署"}完成`,
    onHandle: (emit) => {
      emit("deploy-success");
    },
  },
  cancelled: {
    title: "部署取消",
    icon: "info",
    getText: (serverName) => `服务器 ${serverName} 的部署已取消`,
    onHandle: () => {},
  },
  failed: {
    title: "部署失败",
    icon: "error",
    getText: (serverName) => `服务器 ${serverName} 的部署失败`,
    onHandle: () => {},
  },
};

// 部署状态更新事件处理函数
const handleDeployStatusUpdate = () => {
  // 只有当对话框可见时才处理状态更新
  if (!props.modelValue) {
    return;
  }

  console.log(
    "部署状态更新:",
    deployStore.deployStatus,
    "deploying:",
    deployStore.deploying,
  );

  // 更新本地部署状态
  deploying.value = deployStore.deploying;

  // 获取当前状态配置
  const statusConfig = deployStatusConfig[deployStore.deployStatus];
  console.log(
    "当前状态配置:",
    deployStore.deployStatus,
    deployStore.deploying,
    statusConfig,
  );
  // 处理已完成、失败或取消的状态
  if (statusConfig) {
    // 显示状态消息
    Swal.fire({
      title: statusConfig.title,
      text: statusConfig.getText(serverName.value, props.isExistingServer),
      icon: statusConfig.icon,
      confirmButtonText: "确定",
    });

    // 执行状态特定的处理逻辑
    statusConfig.onHandle(emit);

    // 重置部署状态
    deploying.value = false;
  }
};

// 生命周期钩子
onMounted(() => {
  // 初始化WebSocket连接
  deployStore.initWebSocket();
  // 监听部署状态变化
  window.addEventListener("deploy:status-updated", handleDeployStatusUpdate);
});

onUnmounted(() => {
  // 移除事件监听
  window.removeEventListener("deploy:status-updated", handleDeployStatusUpdate);
});

// 部署表单
const deployForm = ref({
  steamUser: "",
  steamPassword: "",
  interactive: true, // 默认使用交互模式
});

// 部署表单验证规则
const deployRules = {
  steamUser: [
    {
      required: false,
      message: "请输入Steam用户名",
      trigger: "blur",
    },
  ],
  steamPassword: [
    {
      required: false,
      message: "请输入Steam密码",
      trigger: "blur",
    },
  ],
};

// 对话框标题计算属性
const dialogTitle = computed(() => {
  if (props.isDeployToDirectory) {
    return props.deployToDirectoryName
      ? `${props.isExistingServer ? "更新" : "部署"}到目录: ${props.deployToDirectoryName}`
      : "部署服务器";
  }
  return "部署服务器";
});

// 处理部署
const handleDeploy = async () => {
  // 验证表单
  if (!deployFormRef.value) return;
  await deployFormRef.value.validate(async (valid) => {
    if (!valid) return;
    deploying.value = true;
    console.log("部署服务器:", props.serverCount);
    try {
      // 确定服务器名称
      if (props.isDeployToDirectory) {
        // 部署到指定目录
        serverName.value = props.deployToDirectoryName;
      } else {
        // 新部署服务器，自动生成名称
        serverName.value = `server${String(props.serverCount + 1).padStart(2, "0")}`;
      }
      console.log("部署服务器:", serverName.value);
      console.log("部署名:", props.deployToDirectoryName);
      console.log("部署对象:", {
        steamUser: deployForm.value.steamUser,
        steamPassword: deployForm.value.steamPassword,
        serverName: serverName.value,
        interactive: deployForm.value.interactive,
      });
      // 开始部署
      await deployStore.startDeploy({
        steamUser: deployForm.value.steamUser,
        steamPassword: deployForm.value.steamPassword,
        serverName: serverName.value,
        interactive: deployForm.value.interactive,
      });

      Swal.fire({
        title: "部署开始",
        text: `服务器 ${serverName.value} ${
          props.isExistingServer ? "更新" : "部署"
        }正在进行中，请稍候...`,
        icon: "info",
        confirmButtonText: "确定",
      }).then(() => {
        // 关闭当前窗口
        visible.value = false;
        // 延迟1.5秒打开部署控制台窗口
        setTimeout(() => {
          // 打开部署控制台窗口
          showDeployConsole.value = true;
        }, 1000);
      });

      // 开始部署（使用WebSocket获取实时状态）
      // await deployStore.startDeploy(
      //   deployForm.value.steamUser,
      //   deployForm.value.steamPassword,
      //   serverName.value,
      // );
    } catch (error) {
      console.error("部署服务器失败:", error);
      deploying.value = false;
      Swal.fire({
        title: "部署失败",
        text: `服务器 ${serverName.value} ${
          props.isExistingServer ? "更新" : "部署"
        }失败: ${error.message}`,
        icon: "error",
        confirmButtonText: "确定",
      });
    }
  });
};
</script>

<style scoped lang="scss">
// 组件样式
.info-icon {
  margin-left: 10px;
  font-size: 16px;
  color: #409eff;
  cursor: help;
}
</style>
