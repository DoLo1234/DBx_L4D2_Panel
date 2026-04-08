/**
 * 插件管理相关的状态管理
 * 使用 Pinia 进行状态管理，提供插件相关的所有操作和状态
 */
import { defineStore } from "pinia";
import { ref, reactive, computed, inject } from "vue";
import { pluginApi, serverApi } from "@/api";
import { useFileStore } from "./file";

/**
 * 插件管理 Store
 * 提供插件获取、安装、卸载等功能
 */
export const usePluginStore = defineStore("plugin", () => {
  // ==================== 状态管理 ====================
  /**
   * 所有插件列表
   * 包含所有可用和已安装的插件，初始为空数组
   */
  const allPlugins = ref([]);

  /**
   * 已安装插件的ID数组
   * 用于穿梭框组件，初始为空数组
   */
  const pluginIds = ref([]);

  /**
   * 加载状态
   * 用于控制加载动画的显示
   */
  const loading = ref(false);

  /**
   * 插件相关状态
   */
  const state = reactive({
    /**
     * 插件总数
     * 存储插件的总数量，初始为0
     */
    totalPluginsCount: 0,

    /**
     * 已分配插件数量
     * 存储已分配给服务器的插件数量，初始为0
     */
    assignedPluginsCount: 0,

    /**
     * 未分配插件数量
     * 存储未分配给服务器的插件数量，初始为0
     */
    unassignedPluginsCount: 0,

    /**
     * 插件目录大小
     * 存储插件目录的大小，初始为"0 B"
     */
    pluginDirectorySize: "0B",

    /**
     * 插件目录路径
     * 存储插件目录的路径，初始为空字符串
     */
    pluginDirectoryPath: "",
  });

  /**
   * 插件配置文件
   * 从全局配置中注入，初始为空对象
   * @type {Object} 插件配置文件内容
   */
  const backendConfig = inject("backendConfig");
  state.pluginDirectoryPath = backendConfig.availablePluginsPath;

  // ==================== 计算属性 ====================
  /**
   * 插件总数
   */
  const totalPluginsCount = computed(() => state.totalPluginsCount);

  /**
   * 已分配插件数量
   */
  const assignedPluginsCount = computed(() => state.assignedPluginsCount);

  /**
   * 未分配插件数量
   */
  const unassignedPluginsCount = computed(() => state.unassignedPluginsCount);

  /**
   * 插件目录大小
   */
  const pluginDirectorySize = computed(() => state.pluginDirectorySize);

  /**
   * 插件目录路径
   */
  const pluginDirectoryPath = computed(() => state.pluginDirectoryPath);

  // ==================== 方法 ====================
  /**
   * 加载插件数据
   * @param {string} serverName - 服务器名称
   */
  const loadPlugins = async (serverName) => {
    if (!serverName) return;

    loading.value = true;
    try {
      // 获取可用插件和已安装插件
      const [availableResponse, installedResponse] = await Promise.all([
        pluginApi.getAvailablePlugins(),
        pluginApi.getInstalledPlugins(serverName),
      ]);

      const availablePlugins = availableResponse.success
        ? availableResponse.data?.plugins || []
        : [];
      const installedPlugins = installedResponse.success
        ? installedResponse.data?.plugins || []
        : [];

      // 合并所有插件数据
      const pluginsMap = new Map();

      // 添加可用插件
      availablePlugins.forEach((plugin) => {
        pluginsMap.set(plugin.id || plugin.name, {
          key: plugin.id || plugin.name,
          label: plugin.name,
          available: true,
        });
      });

      // 添加已安装插件
      installedPlugins.forEach((plugin) => {
        if (pluginsMap.has(plugin.id || plugin.name)) {
          pluginsMap.set(plugin.id || plugin.name, {
            ...pluginsMap.get(plugin.id || plugin.name),
            installed: true,
          });
        } else {
          pluginsMap.set(plugin.id || plugin.name, {
            key: plugin.id || plugin.name,
            label: plugin.name,
            installed: true,
          });
        }
      });

      // 转换为数组
      allPlugins.value = Array.from(pluginsMap.values());

      // 设置已安装插件的ID数组
      pluginIds.value = installedPlugins.map(
        (plugin) => plugin.id || plugin.name,
      );
    } catch (error) {
      console.error("加载插件数据失败:", error);
      allPlugins.value = [];
      pluginIds.value = [];
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 安装插件
   * @param {string} pluginKey - 插件ID或名称
   * @param {string} serverName - 服务器名称
   */
  const installPlugin = async (pluginKey, serverName) => {
    try {
      const response = await pluginApi.installPlugin(pluginKey, serverName);
      return response;
    } catch (error) {
      console.error("安装插件失败:", error);
      throw error;
    }
  };

  /**
   * 卸载插件
   * @param {string} pluginKey - 插件ID或名称
   * @param {string} serverName - 服务器名称
   */
  const uninstallPlugin = async (pluginKey, serverName) => {
    try {
      const response = await pluginApi.uninstallPlugin(pluginKey, serverName);
      return response;
    } catch (error) {
      console.error("卸载插件失败:", error);
      throw error;
    }
  };

  /**
   * 检查服务器实例状态
   * @param {string} serverName - 服务器名称
   * @returns {boolean} 是否有实例正在运行
   */
  const checkServerInstanceStatus = async (serverName) => {
    try {
      const instanceStatus = await serverApi.getAllInstancesStatus();
      return instanceStatus.data
        .map((item) => {
          if (item.serverId === serverName) return item.status;
        })
        .includes("running");
    } catch (error) {
      console.error("检查服务器实例状态失败:", error);
      return false;
    }
  };

  /**
   * 获取插件概览数据
   * 获取插件的统计信息
   */
  const getPluginsOverview = async () => {
    try {
      // 调用 API 获取插件概览数据
      const response = await pluginApi.getPluginsOverview();

      if (response.success) {
        state.totalPluginsCount = response.data.totalPluginsCount || 0;
        state.pluginDirectorySize = response.data.pluginDirectorySize || "0 B";
      }
    } catch (error) {
      console.error("获取插件概览数据失败:", error);
    }
  };

  // ==================== 暴露的状态和方法 ====================
  /**
   * 需要暴露的响应式数据和方法
   * 包括状态和方法
   */
  return {
    // 状态
    allPlugins, // 所有插件列表
    pluginIds, // 已安装插件的ID数组
    loading, // 加载状态
    totalPluginsCount, // 插件总数
    assignedPluginsCount, // 已分配插件数量
    unassignedPluginsCount, // 未分配插件数量
    pluginDirectorySize, // 插件目录大小
    pluginDirectoryPath, // 插件目录路径

    // 方法
    loadPlugins, // 加载插件数据
    installPlugin, // 安装插件
    uninstallPlugin, // 卸载插件
    checkServerInstanceStatus, // 检查服务器实例状态
    getPluginsOverview, // 获取插件概览数据
  };
});
