import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { authApi } from "@/api";
import router from "@/router";

export const useAuthStore = defineStore("auth", () => {
  // 状态管理
  const token = ref(localStorage.getItem("token") || null);
  const username = ref(localStorage.getItem("username") || null);
  const isAuthenticated = computed(() => token.value !== null);

  // 登录
  const login = async (usernameInput, password) => {
    try {
      const response = await authApi.login({
        username: usernameInput,
        password,
      });

      const { token: newToken, username: user } = response.data;

      // 存储到本地存储
      localStorage.setItem("token", newToken);
      localStorage.setItem("username", user);

      // 更新状态
      token.value = newToken;
      username.value = user;

      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  // 登出
  const logout = () => {
    // 清除本地存储
    localStorage.removeItem("token");
    localStorage.removeItem("username");

    // 更新状态
    token.value = null;
    username.value = null;

    // 导航到登录页面
    router.push("/login");
  };

  // 获取认证头部
  const getAuthHeader = () => {
    return {
      Authorization: `Bearer ${token.value}`,
    };
  };

  // 获取token
  const getToken = () => {
    return token.value;
  };

  // 暴露状态和方法
  return {
    // 状态
    token,
    username,
    isAuthenticated,

    // 方法
    login,
    logout,
    getAuthHeader,
    getToken,
  };
});
