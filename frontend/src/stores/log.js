/**
 * 日志管理相关的状态管理
 * 使用 Pinia 进行状态管理，提供日志相关的所有操作和状态
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import { logApi } from "@/api";

/**
 * 日志管理 Store
 * 提供日志获取、清空等功能
 */
export const useLogStore = defineStore("log", () => {
  // ==================== 状态管理 ====================
  /**
   * 日志列表
   * 包含所有日志的详细信息，初始为空数组
   */
  const logs = ref([]);

  /**
   * 加载状态
   * 用于控制加载动画的显示
   */
  const loading = ref(false);

  /**
   * 总日志数量
   * 用于分页显示
   */
  const totalLogs = ref(0);

  // ==================== 方法 ====================
  /**
   * 获取日志
   * @param {Object} params - 查询参数
   * @param {string} params.type - 日志类型
   * @param {number} params.limit - 每页数量
   * @param {number} params.page - 当前页码
   */
  const getLogs = async (params = {}) => {
    loading.value = true;
    try {
      const response = await logApi.getLogs({
        type: params.type || "",
        limit: params.limit || 20,
        page: params.page || 1,
      });
      console.log("获取日志成功:", response);
      logs.value = response.data || [];
      totalLogs.value = response.pagination.total || logs.value.length;
    } catch (error) {
      console.error("获取日志失败:", error);
      logs.value = [];
      totalLogs.value = 0;
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 清空日志
   * @param {Object} params - 清空参数
   * @param {string} params.type - 日志类型
   */
  const clearLogs = async (params = {}) => {
    try {
      const response = await logApi.clearLogs({
        type: params.type || "",
      });
      return response;
    } catch (error) {
      console.error("清空日志失败:", error);
      throw error;
    }
  };

  // ==================== 暴露的状态和方法 ====================
  /**
   * 需要暴露的响应式数据和方法
   * 包括状态和方法
   */
  return {
    // 状态
    logs, // 日志列表
    loading, // 加载状态
    totalLogs, // 总日志数量

    // 方法
    getLogs, // 获取日志
    clearLogs, // 清空日志
  };
});
