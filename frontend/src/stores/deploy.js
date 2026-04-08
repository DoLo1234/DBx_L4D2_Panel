import { defineStore } from "pinia";
import { ref } from "vue";
import serverApi from "@/api/modules/server";
import websocketService from "@/services/websocketService";

export const useDeployStore = defineStore("deploy", () => {
  // 状态管理
  const deploying = ref(false);
  const consoleLogs = ref([]);
  const deployStatus = ref("idle"); // idle, in_progress, completed, failed, cancelled
  const websocketConnected = ref(false);
  const websocketInitialized = ref(false);

  // 初始化WebSocket连接
  const initWebSocket = () => {
    // 检查是否已经初始化过事件监听器
    if (websocketInitialized.value) {
      return;
    }

    // 连接WebSocket
    websocketService.connect();

    // 注册WebSocket事件监听器
    websocketService.on("onLog", (log) => {
      // console.log("WebSocket接收到日志:", log);
      consoleLogs.value.push(log);
      // 限制日志数量，防止内存占用过多
      if (consoleLogs.value.length > 1000) {
        consoleLogs.value.shift();
      }
    });

    websocketService.on("onStatus", (status) => {
      console.log("WebSocket接收到状态更新:", status);
      deployStatus.value = status.status;
      deploying.value = status.deploying;
      // 触发部署状态更新事件
      window.dispatchEvent(
        new CustomEvent("deploy:status-updated", {
          detail: {
            status: status.status,
            deploying: status.deploying,
          },
        }),
      );

      // 如果部署已完成或失败
      if (
        status.status === "completed" ||
        status.status === "failed" ||
        status.status === "cancelled"
      ) {
        deploying.value = false;
      }
    });

    websocketService.on("onConnect", () => {
      console.log("WebSocket连接成功");
      websocketConnected.value = true;
    });

    websocketService.on("onDisconnect", () => {
      console.log("WebSocket连接断开");
      websocketConnected.value = false;
    });

    websocketService.on("onError", (error) => {
      console.error("WebSocket错误:", error);
    });

    // 标记为已初始化
    websocketInitialized.value = true;
  };

  // 开始部署
  const startDeploy = async (optons) => {
    // 确保WebSocket已连接
    if (!websocketConnected.value) {
      initWebSocket();
    }

    deploying.value = true;
    consoleLogs.value = [];
    deployStatus.value = "in_progress";

    try {
      const response = await serverApi.deployServer({
        ...optons,
      });

      console.log("部署服务器请求已发送，使用WebSocket获取实时日志");

      return true;
    } catch (error) {
      console.error("部署服务器失败:", error);
      deploying.value = false;
      deployStatus.value = "failed";
      return false;
    }
  };

  // 取消部署
  const cancelDeploy = async () => {
    try {
      const response = await serverApi.cancelDeploy();

      deploying.value = false;
      deployStatus.value = response.status;

      return true;
    } catch (error) {
      console.error("取消部署失败:", error);
      return false;
    }
  };

  // 检查部署状态
  const checkDeployStatus = async () => {
    // 确保WebSocket已连接
    if (!websocketConnected.value) {
      initWebSocket();
    }

    try {
      console.log("检查部署状态...");
      // 添加时间戳参数，防止浏览器缓存
      const response = await serverApi.getDeployLogs();

      console.log("获取部署状态响应:", response);

      if (response.logs) {
        consoleLogs.value = response.logs;
        console.log("设置控制台日志:", consoleLogs.value.length, "条");
      }

      if (response.status) {
        deployStatus.value = response.status;
        deploying.value = response.status === "in_progress";
        console.log(
          "设置部署状态:",
          response.status,
          "deploying:",
          deploying.value,
        );
      }
    } catch (error) {
      console.error("获取部署状态失败:", error);
    }
  };

  // 暴露状态和方法
  return {
    // 状态
    deploying,
    consoleLogs,
    deployStatus,
    websocketConnected,
    websocketInitialized,

    // 方法
    initWebSocket,
    startDeploy,
    cancelDeploy,
    checkDeployStatus,
  };
});
