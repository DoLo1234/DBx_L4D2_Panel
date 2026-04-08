import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./style.css";
import ElementPlus from "element-plus";
import { ElMessage } from "element-plus";
import "element-plus/dist/index.css";
// import websocketService from "./services/websocketService";
import Swal from "sweetalert2";
import { fileApi } from "@/api/index";

export const baseSwal = Swal.mixin({
  customClass: {
    container: "swal-z-index",
  },
});

// 挂载时获取后端配置文件
const startApp = async () => {
  try {
    // 初始化WebSocket连接
    // console.log("初始化WebSocket连接...");
    // websocketService.connect();

    const app = createApp(App);

    // 添加全局属性
    app.config.globalProperties.$message = ElMessage;
    app.config.globalProperties.$swal = baseSwal;

    app.use(createPinia());
    app.use(router);
    app.use(ElementPlus);

    let backendConfig = {};
    console.log("获取后端配置文件");
    // 设置时间戳，超过5分钟则重新获取
    const timestamp = localStorage.getItem("BackendConfig");
    if (
      timestamp &&
      Date.now() - JSON.parse(timestamp).timestamp < 5 * 60 * 1000
    ) {
      // console.log("后端配置文件缓存有效, 跳过获取", JSON.parse(timestamp));
      backendConfig = JSON.parse(timestamp);
    } else {
      console.log("后端配置文件缓存无效, 重新获取");
      const datas = await fileApi.getBackendConfig();
      const { data } = datas;
      // 记录到localstorage
      localStorage.setItem(
        "BackendConfig",
        JSON.stringify({ ...data, timestamp: Date.now() }),
      );
      backendConfig = data;
    }

    // 提供 Swal 实例供组件注入
    app.provide("$swal", baseSwal);
    app.provide("backendConfig", backendConfig);

    app.mount("#app");

    // 监听应用关闭事件，断开WebSocket连接
    // window.addEventListener("beforeunload", () => {
    //   console.log("应用关闭，断开WebSocket连接...");
    //   websocketService.disconnect();
    // });
  } catch (error) {
    console.error("加载全局配置失败:", error);
  }
};

startApp();
