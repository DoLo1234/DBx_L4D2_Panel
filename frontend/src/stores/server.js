/**
 * 服务器管理相关的状态管理
 * 使用 Pinia 进行状态管理，提供服务器相关的所有操作和状态
 */
import { defineStore } from "pinia";
import { ref, computed, reactive } from "vue";
import { fileApi, serverApi } from "@/api"; // 文件管理和服务器管理相关 API
import { useInstanceStore } from "./instance";

/**
 * 服务器管理 Store
 * 提供服务器列表、状态管理、文件操作等功能
 */
export const useServerStore = defineStore("server", () => {
  // ==================== 状态管理 ====================
  /**
   * 服务器列表
   * 包含所有服务器的基本信息，初始为空数组
   */
  const servers = ref([]);

  /**
   * 服务器状态
   * 包含服务器是否存在、实例总数、运行中的实例数、插件数等详细信息
   */
  const serverStatus = reactive({
    serverExists: false,
    allInstances: 0,
    runningInstances: 0,
    installedPlugins: 0,
  });

  /**
   * 当前激活的服务器索引
   * 用于跟踪用户当前选择的服务器
   */
  const activeServerIndex = ref(0);

  /**
   * 加载状态
   * 用于控制加载动画的显示
   */
  const loading = ref(false);

  /**
   * 根目录总大小（字节）
   * 存储服务器根目录的总文件大小
   */
  const totalDirectorySize = ref(0);

  // ==================== 计算属性 ====================
  /**
   * 总文件大小（字节）
   * 优先使用从后端获取的根目录总大小，否则前端计算
   */
  const totalFileSize = computed(() => {
    // 优先使用从后端获取的根目录总大小
    if (totalDirectorySize.value > 0) {
      return totalDirectorySize.value;
    }

    // 后备方案：前端计算总文件大小
    let totalSize = 0;
    servers.value.forEach((server) => {
      if (server.files) {
        totalSize += calculateFileSize(server.files);
      }
    });
    return totalSize;
  });

  /**
   * 总文件大小（GB）
   * 将字节转换为 GB 单位，保留整数
   */
  const totalFileSizeGB = computed(() => {
    const bytesToGB = 1024 * 1024 * 1024;
    return parseFloat((totalFileSize.value / bytesToGB).toFixed(0));
  });

  // ==================== 方法 ====================
  /**
   * 获取服务器列表
   * @param {string} basePath - 服务器根目录路径
   */
  const getServers = async (basePath) => {
    try {
      if (!basePath) return;
      console.log("basePath", basePath);
      await getFileTree(basePath);
    } catch (error) {
      console.error("获取服务器列表失败:", error);
      throw error;
    }
  };

  /**
   * 获取服务器状态
   * 从后端获取服务器状态，更新状态管理
   * @returns {Promise<void>} 无返回值
   */
  const getServerStatus = async () => {
    try {
      const response = await serverApi.getServerStatus();
      if (response.success) {
        const data = response.data;
        serverStatus.serverExists = data.serverExists || false;
        serverStatus.allInstances = data.allInstances || 0;
        serverStatus.runningInstances = data.runningInstances || 0;
        serverStatus.installedPlugins = data.installedPlugins || 0;
      }
    } catch (error) {
      console.error("获取服务器状态失败:", error);
      serverStatus.serverExists = false;
      serverStatus.allInstances = 0;
      serverStatus.runningInstances = 0;
      serverStatus.installedPlugins = 0;
    }
  };

  /**
   * 获取文件树
   * @param {string} filePath - 目录路径
   */
  const getFileTree = async (filePath) => {
    try {
      loading.value = true;
      const response = await fileApi.getFileTree(filePath);
      // 处理文件树，只加载服务器文件夹列表
      const fileTree = response.success ? response.data?.files || [] : [];
      servers.value = fileTree.map((item) => ({
        name: item.name,
        path: item.path,
        files: null, // 初始为null，切换时再加载
        isServer: item.isServer || false,
      }));
      getRootDirectorySize();
    } catch (error) {
      console.error("获取文件树失败:", error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 获取根目录大小
   * 从后端获取服务器根目录的总大小
   */
  const getRootDirectorySize = async () => {
    try {
      const response = await fileApi.getRootDirectorySize();
      if (response.success && response.data?.size !== undefined) {
        totalDirectorySize.value = response.data.size;
      }
    } catch (error) {
      console.error("获取根目录大小失败:", error);
    }
  };

  /**
   * 加载服务器文件
   * @param {string} activeTab - 当前激活的服务器名称
   */
  const loadServerFiles = async (activeTab) => {
    try {
      loading.value = true;
      const server = servers.value.find((s) => s.name === activeTab);
      if (server) {
        console.log("加载服务器文件...", server);
        // 调用API获取服务器根目录的内容
        const response = await fileApi.getFileTree(server.path);
        const files = response.success ? response.data?.files || [] : [];
        // 确保每个文件/目录都有正确的type属性
        const processedFiles = files.map((item) => ({
          ...item,
          type: item.type || (item.children ? "directory" : "file"),
          disabled: item.children ? true : false,
        }));

        server.files = processedFiles;
        // 添加短暂延迟，确保界面有足够时间更新
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error("加载服务器文件失败:", error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 保存文件修改
   * @param {string} filePath - 文件路径
   * @param {string} content - 文件内容
   */
  const saveFileChanges = async (filePath, content) => {
    try {
      await fileApi.saveFileContent({
        path: filePath,
        content: content,
      });
    } catch (error) {
      console.error("保存文件修改失败:", error);
      throw error;
    }
  };

  /**
   * 计算文件大小
   * @param {Array} files - 文件列表
   * @returns {number} 总文件大小（字节）
   */
  const calculateFileSize = (files) => {
    let totalSize = 0;
    const traverse = (items) => {
      items.forEach((item) => {
        if (item.type === "file" && item.size) {
          totalSize += item.size;
        } else if (item.children) {
          traverse(item.children);
        }
      });
    };
    traverse(files);
    return totalSize;
  };

  /**
   * 获取服务器标签信息
   * @param {Object} server - 服务器对象
   * @returns {Object} 标签信息，包含类型和文本
   */
  const getServerTagInfo = (server) => {
    // 使用 Map 做 O(1) 查找，避免多次正则匹配
    const tagMap = new Map([
      ["deployed", { type: "success", text: "已部署" }],
      ["undeployed", { type: "danger", text: "未部署" }],
      ["default", { type: "info", text: "普通目录" }],
    ]);

    if (server.isServer) return tagMap.get("deployed");
    if (/^server\d+$/.test(server.name)) return tagMap.get("undeployed");
    return tagMap.get("default");
  };

  // ==================== 暴露的状态和方法 ====================
  /**
   * 需要暴露的响应式数据和方法
   * 包括状态、计算属性和方法
   */
  return {
    // 状态
    servers, // 服务器列表
    activeServerIndex, // 当前激活的服务器索引
    loading, // 加载状态
    totalDirectorySize, // 根目录总大小（字节）
    serverStatus, // 服务器状态管理

    // 计算属性
    totalFileSize, // 总文件大小（字节）
    totalFileSizeGB, // 总文件大小（GB）

    // 方法
    getServers, // 获取服务器列表
    getFileTree, // 获取文件树
    getRootDirectorySize, // 获取根目录大小
    loadServerFiles, // 加载服务器文件
    getServerStatus, // 获取服务器状态
    saveFileChanges, // 保存文件修改
    getServerTagInfo, // 获取服务器标签信息
  };
});
