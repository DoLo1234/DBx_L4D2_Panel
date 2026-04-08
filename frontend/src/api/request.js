import axios from "axios";
import { useAuthStore } from "@/stores/auth";
import { baseSwal } from "@/main.js";

// 创建axios实例
const service = axios.create({
  baseURL: "/api",
  timeout: 10000, // 增加默认超时到10秒
});

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 获取认证store
    const authStore = useAuthStore();

    // 添加认证token
    const token = authStore.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 对于非FormData请求，设置默认Content-Type
    if (!(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }
    return config;
  },
  (error) => {
    console.error("请求错误:", error);
    return Promise.reject(error);
  },
);

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    const res = response.data;
    return res;
  },
  (error) => {
    // console.error("响应错误:", error);

    // 处理错误信息
    let errorMessage = "请求失败";
    if (error.response) {
      // 服务器返回错误状态码
      const status = error.response.status;
      switch (status) {
        case 403:
          errorMessage = "拒绝访问";
          break;
        case 404:
          errorMessage = "请求的资源不存在";
          break;
        case 500:
          errorMessage = error.response.data?.error || "服务器内部错误";
          break;
        case 505:
          errorMessage =
            error.response.data?.error || "令牌令牌已过期，请重新登录";
          // 清除所有其他请求-以免继续发送过期的令牌
          service.defaults.headers.common["Authorization"] = "";
          // 清除认证信息并跳转到登录页
          const authStore = useAuthStore();
          authStore.logout();
          break;
        default:
          errorMessage = error.response.data?.error || `请求失败 (${status})`;
      }
    } else if (error.request) {
      // 请求已发出但没有收到响应
      errorMessage = "请求超时，请检查网络连接";
    } else {
      // 请求配置错误
      errorMessage = error.message;
    }
    console.error("错误信息:", errorMessage);
    // 显示错误提示
    baseSwal.fire({
      title: "错误",
      text: errorMessage,
      icon: "error",
      confirmButtonText: "确定",
    });

    return Promise.reject(errorMessage);
  },
);

export default service;
