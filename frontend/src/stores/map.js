/**
 * 地图管理相关的状态管理
 * 使用 Pinia 进行状态管理，提供地图相关的所有操作和状态
 */
import { defineStore } from "pinia";
import { reactive, computed, ref, inject } from "vue";
import { mapApi } from "@/api";

/**
 * 地图管理 Store
 * 提供地图目录路径管理等功能
 */
export const useMapStore = defineStore("map", () => {
  // ==================== 状态管理 ====================
  /**
   * 地图相关状态
   */
  const state = reactive({
    /**
     * 地图目录路径
     * 存储地图目录的路径，初始为空字符串
     */
    mapDirectoryPath: "",

    /**
     * 地图统计数据
     */
    stats: {
      /**
       * 地图总数
       * 存储地图的总数量，初始为0
       */
      totalMapsCount: 0,

      /**
       * 已分配地图数量
       * 存储已分配给服务器的地图数量，初始为0
       */
      assignedMapsCount: 0,

      /**
       * 未分配地图数量
       * 存储未分配给服务器的地图数量，初始为0
       */
      unassignedMapsCount: 0,

      /**
       * 地图目录大小
       * 存储地图目录的大小，初始为"0 G"
       */
      mapDirectorySize: "0G",
    },
  });

  // 记录所有已分配的地图
  const assignedMaps = ref([]);

  // ==================== 计算属性 ====================
  /**
   * 地图总数
   */
  const totalMapsCount = computed(() => state.stats.totalMapsCount);

  /**
   * 已分配地图数量
   */
  const assignedMapsCount = computed(() => state.stats.assignedMapsCount);

  /**
   * 未分配地图数量
   */
  const unassignedMapsCount = computed(() => state.stats.unassignedMapsCount);

  /**
   * 地图目录大小
   */
  const mapDirectorySize = computed(() => state.stats.mapDirectorySize);

  // ==================== 方法 ====================
  /**
   * 设置地图目录路径
   * @param {string} path - 地图目录路径
   */
  const backendConfig = inject("backendConfig");
  state.mapDirectoryPath = backendConfig?.mapsPath || "";

  /**
   * 获取地图统计数据
   * 获取地图的统计信息
   * @param {string} serverName - 服务器名称
   */
  const getMapsOverview = async (serverName) => {
    try {
      if (!serverName) {
        console.error("服务器名称不能为空");
        return;
      }

      // 获取地图统计数据
      const response = await mapApi.getMapsOverview(serverName);
      console.log("获取地图统计数据响应:", response);
      if (response.success) {
        state.stats.totalMapsCount = response.data.totalMapsCount || 0;
        state.stats.assignedMapsCount = response.data.assignedMapsCount || 0;
        state.stats.unassignedMapsCount =
          response.data.unassignedMapsCount || 0;
        state.stats.mapDirectorySize = response.data.mapDirectorySize || "0G";
        assignedMaps.value = response.data.assignMapData || [];
      }
    } catch (error) {
      console.error("获取地图统计数据失败:", error);
    }
  };

  /**
   * 分配地图到服务器
   * @param {Array} maps - 地图列表
   * @param {string} serverName - 服务器名称
   * @returns {Promise<boolean>} 是否分配成功
   */
  const assignMap = async (maps, serverName) => {
    try {
      if (!maps || maps.length === 0) {
        console.error("地图列表不能为空");
        return false;
      }

      if (!serverName) {
        console.error("服务器名称不能为空");
        return false;
      }

      for (const map of maps) {
        await mapApi.assignMap(map.name, serverName);
      }

      // 重新获取地图统计数据
      await getMapsOverview(serverName);
      return true;
    } catch (error) {
      console.error("分配地图失败:", error);
      throw error;
    }
  };

  /**
   * 从服务器取消分配地图
   * @param {Array} maps - 地图列表
   * @param {string} serverName - 服务器名称
   * @returns {Promise<boolean>} 是否取消分配成功
   */
  const unassignMap = async (maps, serverName) => {
    try {
      if (!maps || maps.length === 0) {
        console.error("地图列表不能为空");
        return false;
      }

      if (!serverName) {
        console.error("服务器名称不能为空");
        return false;
      }

      for (const map of maps) {
        await mapApi.unassignMap(map.name, serverName);
      }

      // 重新获取地图统计数据
      await getMapsOverview(serverName);
      return true;
    } catch (error) {
      console.error("取消分配地图失败:", error);
      throw error;
    }
  };

  /**
   * 解压地图
   * @param {Array} files - 要解压的文件列表
   * @param {boolean} deleteSource - 是否删除源文件
   * @returns {Promise<Object>} 解压结果，包含成功和失败的文件
   */
  const extractMaps = async (files, deleteSource = false) => {
    try {
      if (!files || files.length === 0) {
        console.error("文件列表不能为空");
        return { successFiles: [], failedFiles: [] };
      }

      // 逐个解压文件
      const successFiles = [];
      const failedFiles = [];

      for (const file of files) {
        try {
          const response = await mapApi.extractMap(file.name, deleteSource);
          if (response.success) {
            successFiles.push(file.name);
          } else {
            failedFiles.push({
              name: file.name,
              message: response.message || "解压失败",
            });
          }
        } catch (error) {
          failedFiles.push({ name: file.name, message: error.message });
        }
      }

      return { successFiles, failedFiles };
    } catch (error) {
      console.error("解压地图失败:", error);
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
    mapDirectoryPath: computed(() => state.mapDirectoryPath), // 地图目录路径
    totalMapsCount, // 地图总数
    assignedMapsCount, // 已分配地图数量
    unassignedMapsCount, // 未分配地图数量
    mapDirectorySize, // 地图目录大小
    assignedMaps, // 已分配地图

    // 方法
    getMapsOverview, // 获取地图统计数据
    assignMap, // 分配地图到服务器
    unassignMap, // 从服务器取消分配地图
    extractMaps, // 解压地图
  };
});
