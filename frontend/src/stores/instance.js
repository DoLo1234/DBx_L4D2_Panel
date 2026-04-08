/**
 * 服务器实例管理相关的状态管理
 * 使用 Pinia 进行状态管理，提供实例相关的所有操作和状态
 */
import { defineStore } from "pinia";
import { ref, computed, inject } from "vue";
import { serverApi } from "@/api"; // 服务器相关 API

/**
 * 服务器实例管理 Store
 * 提供服务器实例列表、状态管理等功能
 */
export const useInstanceStore = defineStore("instance", () => {
  // ==================== 状态管理 ====================
  /**
   * 服务器实例列表
   * 包含所有服务器实例的详细信息，初始为空数组
   */
  const serverInstances = ref([]);

  const backendConfig = inject("backendConfig");
  const localIP = ref(backendConfig?.localIP);

  /**
   * 已部署的服务器列表
   * 包含所有已部署服务器的信息，初始为空数组
   */
  const deployedServers = ref([]);

  /**
   * 服务器数量
   * 存储服务器的数量，初始为0
   */
  const serverCount = ref(0);

  /**
   * 加载状态
   * 用于控制加载动画的显示
   */
  const loading = ref(false);

  // ==================== 计算属性 ====================
  /**
   * 运行中实例数量
   * 计算当前运行中的服务器实例数量
   */
  const runningInstancesCount = computed(() => {
    return serverInstances.value.filter(
      (instance) => instance.status === "running",
    ).length;
  });

  /**
   * 已停止实例数量
   * 计算当前已停止的服务器实例数量
   */
  const stoppedInstancesCount = computed(() => {
    return serverInstances.value.filter(
      (instance) => instance.status === "stopped",
    ).length;
  });

  /**
   * 总实例数量
   * 计算当前服务器实例的总数量
   */
  const totalInstancesCount = computed(() => {
    return serverInstances.value.length;
  });

  // ==================== 方法 ====================
  /**
   * 获取已部署的服务器列表
   */
  const getDeployedServers = async () => {
    try {
      const response = await serverApi.getServerList();
      deployedServers.value = response.data?.servers || [];
      console.log("已部署的服务器列表:", deployedServers.value);
    } catch (error) {
      console.error("获取已部署服务器列表失败:", error);
      deployedServers.value = [];
      throw error;
    }
  };

  /**
   * 获取服务器数量
   */
  const getServerCount = async () => {
    try {
      const response = await serverApi.getServerCount();
      serverCount.value = response.data?.count || 0;
    } catch (error) {
      console.error("获取服务器数量失败:", error);
      serverCount.value = 0;
      throw error;
    }
  };

  /**
   * 获取服务器实例
   */
  const getServerInstances = async (afterSearch = false) => {
    loading.value = true;
    try {
      const finalResponse = await serverApi.getAllInstancesStatus();
      await new Promise((res) => setTimeout(res, 500));
      // 检查响应结构
      if (!finalResponse) {
        console.error("获取服务器实例失败: 响应结构不正确", finalResponse);
        serverInstances.value = [];
        return;
      }
      // 如果返回对象包含instances字段
      serverInstances.value = finalResponse.data || [];
      // 对于运行中的实例，查询服务器信息（后台执行，不阻塞主流程）
      for (const instance of serverInstances.value) {
        if (instance.status === "running") {
          // 不使用 await，让查询在后台执行
          queryServerInfo(instance, afterSearch);
        }
      }
    } catch (error) {
      console.error("获取服务器实例失败:", error);
      serverInstances.value = [];
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 查询服务器信息
  const queryServerInfo = async (instance, afterSearch = false) => {
    try {
      // 如果不需要立即查询，等待4秒，确保服务器已启动
      if (afterSearch) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
      const response = await serverApi.queryServer({
        host: localIP.value,
        port: instance.port,
      });

      if (response.success) {
        // 更新实例信息
        instance.runInfo = response.data;
      }
    } catch (error) {
      console.error(`查询服务器 ${instance.name} 信息失败:`, error);
      // 保持原有信息不变
    }
  };

  /**
   * 启动实例
   * @param {Object} instance - 实例对象
   */
  const startInstance = async (instance) => {
    loading.value = true;
    try {
      const response = await serverApi.startInstance(instance);
      // 刷新实例状态，确保服务器确实在运行
      await getServerInstances(true);
      return response;
    } catch (error) {
      console.error("启动实例失败:", error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 重启实例
   * @param {Object} instance - 实例对象
   */
  const restartInstance = async (instance) => {
    loading.value = true;
    try {
      console.log("重启实例:", instance);
      // 先检查实例是否正在运行
      if (instance.status !== "running") {
        throw new Error("实例未运行，无法重启");
      }
      // 然后停止实例
      const response = await serverApi.stopInstance(instance).then(() => {
        return serverApi.startInstance(instance);
      });
      // 等待实例停止完成
      // 刷新实例状态
      await getServerInstances(true);
      return response;
    } catch (error) {
      console.error("重启实例失败:", error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 停止实例
   * @param {Object} instance - 实例对象
   */
  const stopInstance = async (instance) => {
    loading.value = true;
    try {
      const response = await serverApi.stopInstance(instance);
      // 刷新实例状态
      await getServerInstances();
      return response;
    } catch (error) {
      console.error("停止实例失败:", error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 删除实例
   * @param {string} name - 实例名称
   */
  const deleteInstance = async (name) => {
    try {
      const response = await serverApi.deleteInstance(name);
      // 刷新实例列表
      await getServerInstances();
      return response;
    } catch (error) {
      console.error("删除实例失败:", error);
      throw error;
    }
  };

  /**
   * 刷新实例状态
   */
  const refreshInstances = async () => {
    await loadAllInstances();
  };

  /**
   * 添加实例
   * @param {Object} instance - 实例对象
   */
  const addInstance = async (instance) => {
    try {
      const response = await serverApi.addInstance(instance);
      // 刷新实例状态
      await getServerInstances();
      return response;
    } catch (error) {
      console.error("添加实例失败:", error);
      throw error;
    }
  };

  /**
   * 编辑实例
   * @param {string} name - 实例名称
   * @param {Object} instance - 实例对象
   */
  const editInstance = async (name, instance) => {
    try {
      const response = await serverApi.editInstance(name, instance);
      // 刷新实例状态
      await getServerInstances();
      return response;
    } catch (error) {
      console.error("编辑实例失败:", error);
      throw error;
    }
  };

  /**
   * 加载所有实例数据
   * 顺序执行请求，第一个失败就取消所有后续请求
   */
  const loadAllInstances = async () => {
    try {
      // 顺序执行请求
      await getDeployedServers();
      await getServerCount();
      await getServerInstances();

      // 返回与Promise.all相同的结构
      return [
        undefined, // getDeployedServers的返回值
        undefined, // getServerCount的返回值
        undefined, // getServerInstances的返回值
      ];
    } catch (error) {
      // 第一个失败就取消所有后续请求
      console.error("加载实例数据失败:", error);
      throw error;
    }
  };

  // ==================== 暴露的状态和方法 ====================
  /**
   * 需要暴露的响应式数据和方法
   * 包括状态、计算属性和方法
   */
  return {
    // 状态
    serverInstances, // 服务器实例列表
    deployedServers, // 已部署的服务器列表
    serverCount, // 服务器数量
    loading, // 加载状态

    // 计算属性
    runningInstancesCount, // 运行中实例数量
    stoppedInstancesCount, // 已停止实例数量
    totalInstancesCount, // 总实例数量

    // 方法
    getDeployedServers, // 获取已部署的服务器列表
    getServerCount, // 获取服务器数量
    getServerInstances, // 获取服务器实例
    queryServerInfo, // 查询服务器信息
    startInstance, // 启动实例
    restartInstance, // 重启实例
    stopInstance, // 停止实例
    deleteInstance, // 删除实例
    addInstance, // 添加实例
    editInstance, // 编辑实例
    refreshInstances, // 刷新实例状态
    loadAllInstances, // 加载所有实例数据
  };
});
