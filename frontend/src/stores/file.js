import { defineStore } from "pinia";
import { reactive, toRefs, ref } from "vue";
import { FileUploader } from "@/utils/fileUploader";
import { fileApi } from "@/api";
import { useNetwork } from "@vueuse/core";

const network = reactive(useNetwork());
const { saveData, downlink, rtt } = toRefs(network);

/**
 * 根据网络状况获取合适的分块大小
 * 综合使用 Network Information API 的多个指标来判断网络质量
 * @returns {number} 分块大小（字节）
 */
const getOptimalChunkSize = () => {
  const currentDownlink = downlink.value;
  const currentRtt = rtt.value;
  const currentSaveData = saveData.value;

  // 如果开启了省流量模式，使用较小的分块
  if (currentSaveData) {
    return 128 * 1024; // 128KB
  }

  // 根据 RTT (往返时间) 判断网络延迟
  // RTT > 500ms 认为是高延迟网络
  if (currentRtt && currentRtt > 500) {
    return 512 * 1024; // 512KB
  }

  // 根据下行速度判断
  if (currentDownlink !== undefined && currentDownlink !== null) {
    if (currentDownlink < 0.5) {
      // 小于 0.5 Mbps，极慢网络
      return 64 * 1024; // 64KB
    } else if (currentDownlink < 10) {
      // 2-10 Mbps，中等网络
      return 5 * 1024 * 1024; // 5MB
    } else {
      // 大于 10 Mbps，快速网络
      return 10 * 1024 * 1024; // 10MB
    }
  }

  // 默认分块大小
  return 5 * 1024 * 1024; // 5MB
};

/**
 * 文件上传状态管理
 */
export const useFileStore = defineStore("file", () => {
  // 状态
  const uploading = ref(false);
  // 存储每个文件的进度信息 - 使用响应式对象替代 Map
  const fileProgressMap = ref({});

  // 存储待上传的文件列表
  const uploadFiles = ref([]);

  /**
   * 获取或创建文件的进度信息
   * @param {string} fileId - 文件唯一标识
   * @returns {Object} - 进度信息对象
   */
  const getFileProgress = (fileId) => {
    if (!fileProgressMap.value[fileId]) {
      fileProgressMap.value[fileId] = {
        progress: 0,
        status: "",
        name: "",
      };
    }
    return fileProgressMap.value[fileId];
  };

  /**
   * 上传小文件
   * @param {File} file - 要上传的文件
   * @param {string} uploadPath - 上传路径
   * @param {string} relativePath - 文件相对路径
   * @param {string} fileId - 文件唯一标识
   * @returns {Promise<void>}
   */
  const uploadSmallFile = async (
    file,
    uploadPath,
    relativePath = "",
    fileId,
  ) => {
    const actualFileId = fileId || file.name;

    // 初始化进度信息 - 使用响应式更新
    fileProgressMap.value[actualFileId] = {
      progress: 0,
      status: `上传中: ${file.name}`,
      name: file.name,
    };

    try {
      // 确保使用统一的正斜杠分隔符
      let normalizedPath = uploadPath.replace(/\\/g, "/");

      // 如果有相对路径，添加到上传路径中
      if (relativePath) {
        normalizedPath = `${normalizedPath}/${relativePath}`;
      }

      await FileUploader.uploadSmallFile(file, {
        uploadPath: normalizedPath,
        onProgress: (progress) => {
          // 使用响应式更新
          fileProgressMap.value[actualFileId] = {
            ...fileProgressMap.value[actualFileId],
            progress,
          };
        },
      });

      // 使用响应式更新
      fileProgressMap.value[actualFileId] = {
        ...fileProgressMap.value[actualFileId],
        progress: 100,
        status: `完成上传: ${file.name}`,
      };
    } catch (error) {
      console.error("上传失败:", error);
      // 使用响应式更新
      fileProgressMap.value[actualFileId] = {
        ...fileProgressMap.value[actualFileId],
        status: `上传失败: ${error.message}`,
      };
      throw error;
    }
  };

  /**
   * 上传大文件（分块并发上传）
   * 流程：初始化上传 → 服务器创建.temp文件夹 → 创建以uploadId命名的子文件夹 → 并发上传分片 → 合并
   * 并发上传池：切好一个分片就投入上传，最多10路并发，有空位自动补充
   * @param {File} file - 要上传的文件
   * @param {string} uploadPath - 上传路径
   * @param {string} relativePath - 文件相对路径
   * @param {string} fileId - 文件唯一标识
   * @returns {Promise<void>}
   */
  const uploadLargeFile = async (
    file,
    uploadPath,
    relativePath = "",
    fileId,
  ) => {
    const actualFileId = fileId || file.name;

    // 初始化进度信息 - 使用响应式更新
    fileProgressMap.value[actualFileId] = {
      progress: 0,
      status: "准备上传...",
      name: file.name,
    };

    try {
      // 确保使用统一的正斜杠分隔符
      let normalizedPath = uploadPath.replace(/\\/g, "/");

      // 如果有相对路径，添加到上传路径中
      if (relativePath) {
        normalizedPath = `${normalizedPath}/${relativePath}`;
      }

      // 根据网络状况获取合适的分块大小
      const optimalChunkSize = getOptimalChunkSize();
      console.log("Optimal Chunk Size:", optimalChunkSize);

      await FileUploader.uploadLargeFile(file, {
        uploadPath: normalizedPath,
        chunkSize: optimalChunkSize,
        maxConcurrency: 10, // 最大10路并发上传分片
        onProgress: (progress) => {
          // 使用响应式更新
          fileProgressMap.value[actualFileId] = {
            ...fileProgressMap.value[actualFileId],
            progress: progress,
          };
        },
        onStatus: (status) => {
          // 使用响应式更新
          fileProgressMap.value[actualFileId] = {
            ...fileProgressMap.value[actualFileId],
            status: status,
          };
        },
        // 启用断点续传
        enableResume: false,
        // 计算文件哈希用于断点续传
        onHashProgress: (progress) => {
          // 使用响应式更新
          fileProgressMap.value[actualFileId] = {
            ...fileProgressMap.value[actualFileId],
            status: `计算文件哈希进度: ${Math.round(progress * 100)}%`,
            progress: Math.round(progress * 100),
          };
        },
      });

      // 使用响应式更新
      fileProgressMap.value[actualFileId] = {
        ...fileProgressMap.value[actualFileId],
        progress: 100,
      };
    } catch (error) {
      console.error("上传失败:", error);
      // 使用响应式更新
      fileProgressMap.value[actualFileId] = {
        ...fileProgressMap.value[actualFileId],
        status: `上传失败: ${error.message}`,
      };
      throw error;
    }
  };

  /**
   * 提交文件上传
   * 多个文件并发上传，每个大文件内部最多10路并发分片上传
   * @param {Array} files - 文件列表
   * @param {string} uploadPath - 上传路径
   * @param {Function} onSuccess - 成功回调
   * @param {Function} onError - 错误回调
   * @returns {Promise<void>}
   */
  const submitUpload = async (files, uploadPath, onSuccess, onError) => {
    if (files.length === 0) return;

    uploading.value = true;
    // 清空之前的进度信息
    fileProgressMap.value = {};

    try {
      // 为所有文件初始化进度
      const uploadTasks = files.map((file) => {
        const rawFile = file.raw;
        const relativePath = file.relativePath || "";
        const fileId = file.uid || file.name;

        // 初始化文件进度
        getFileProgress(fileId);

        // 根据文件大小选择上传方式
        if (rawFile.size > 100 * 1024 * 1024) {
          return uploadLargeFile(rawFile, uploadPath, relativePath, fileId);
        } else {
          return uploadSmallFile(rawFile, uploadPath, relativePath, fileId);
        }
      });

      // 所有文件并发上传
      await Promise.all(uploadTasks);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("上传文件失败:", error);
      if (onError) {
        onError(error);
      }
    } finally {
      uploading.value = false;
    }
  };

  /**
   * 重置上传状态
   */
  const resetUploadStatus = () => {
    uploading.value = false;
    fileProgressMap.value = {};
  };

  /**
   * 创建新文件
   * @param {string} fileName - 文件名
   * @param {string} currentPath - 当前路径
   * @param {Array} existingFiles - 现有文件列表
   * @returns {Promise<boolean>} - 是否创建成功
   */
  const saveNewFile = async (fileName, currentPath, existingFiles) => {
    if (!fileName) return false;

    // 如果文件名已存在(不区分大小写)，则提示用户
    if (
      existingFiles.some(
        (file) => file.name.toLowerCase() === fileName.toLowerCase(),
      )
    ) {
      return false;
    }

    try {
      let newFilePath;
      if (currentPath) {
        // 确保使用统一的正斜杠分隔符
        newFilePath = `${currentPath.replace(/\\/g, "/")}/${fileName}`;
      } else {
        newFilePath = fileName;
      }

      await fileApi.createFile({
        path: newFilePath,
        content: "",
      });

      return true;
    } catch (error) {
      console.error("创建文件失败:", error);
      throw error;
    }
  };

  /**
   * 创建新文件夹
   * @param {string} directoryName - 文件夹名
   * @param {string} currentPath - 当前路径
   * @param {Array} existingFiles - 现有文件列表
   * @returns {Promise<boolean>} - 是否创建成功
   */
  const saveNewDirectory = async (
    directoryName,
    currentPath,
    existingFiles,
  ) => {
    if (!directoryName) return false;

    // 如果文件夹名已存在(不区分大小写)，则提示用户
    if (
      existingFiles.some(
        (file) => file.name.toLowerCase() === directoryName.toLowerCase(),
      )
    ) {
      return false;
    }

    try {
      let newDirectoryPath;
      if (currentPath) {
        // 确保使用统一的正斜杠分隔符
        newDirectoryPath = `${currentPath.replace(/\\/g, "/")}/${directoryName}`;
      } else {
        newDirectoryPath = directoryName;
      }

      await fileApi.createDirectory(newDirectoryPath);

      return true;
    } catch (error) {
      console.error("创建文件夹失败:", error);
      throw error;
    }
  };

  /**
   * 删除文件
   * @param {Array} files - 要删除的文件列表
   * @returns {Promise<boolean>} - 是否删除成功
   */
  const deleteFiles = async (files) => {
    if (files.length === 0) return false;

    try {
      for (const file of files) {
        await fileApi.deleteFile(file.path);
      }

      return true;
    } catch (error) {
      console.error("删除文件失败:", error);
      throw error;
    }
  };

  /**
   * 获取文件内容
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>} - 文件内容
   */
  const getFileContent = async (filePath) => {
    try {
      const response = await fileApi.getFileContent(filePath);
      return {
        content: response.success ? response.data?.content : "",
      };
    } catch (error) {
      console.error("获取文件内容失败:", error);
      throw error;
    }
  };

  /**
   * 保存文件修改
   * @param {string} filePath - 文件路径
   * @param {string} content - 文件内容
   * @returns {Promise<boolean>} - 是否保存成功
   */
  const saveFileContent = async (filePath, content) => {
    try {
      await fileApi.saveFileContent({
        path: filePath,
        content: content,
      });

      return true;
    } catch (error) {
      console.error("保存文件修改失败:", error);
      throw error;
    }
  };

  /**
   * 获取文件树
   * @param {string} path - 目录路径
   * @returns {Promise<Array>} - 文件树列表
   */
  const getFileTree = async (path) => {
    try {
      const response = await fileApi.getFileTree(path);
      const fileList = response.success ? response.data?.files || [] : [];
      return fileList.map((item) => ({
        ...item,
        type: item.type || (item.children ? "directory" : "file"),
      }));
    } catch (error) {
      console.error("获取文件树失败:", error);
      throw error;
    }
  };

  /**
   * 判断文件是否可编辑
   * @param {string} fileName - 文件名
   * @returns {boolean} - 是否可编辑
   */
  const isEditableFile = (fileName) => {
    if (!fileName) return false;

    const lowerFileName = fileName.toLowerCase();

    // 可编辑文件的扩展名和文件名模式列表
    const editablePatterns = [
      // 配置文件
      ".cfg",
      ".ini",
      ".conf",
      ".config",
      ".properties",
      ".env",
      // 文本文件
      ".txt",
      ".md",
      ".markdown",
      ".rst",
      ".log",
      ".csv",
      ".tsv",
      // 网页相关
      ".html",
      ".htm",
      ".css",
      ".scss",
      ".sass",
      ".less",
      ".js",
      ".jsx",
      ".ts",
      ".tsx",
      ".json",
      ".xml",
      ".svg",
      // 脚本文件
      ".sh",
      ".bat",
      ".cmd",
      ".ps1",
      ".py",
      ".php",
      ".rb",
      ".pl",
      ".lua",
      ".perl",
      ".awk",
      ".sp",
      // 编程相关
      ".java",
      ".cpp",
      ".c",
      ".h",
      ".hpp",
      ".cs",
      ".go",
      ".rust",
      ".swift",
      ".kt",
      ".scala",
      ".dart",
      // 其他配置文件
      ".yml",
      ".yaml",
      ".toml",
      ".json5",
      ".graphql",
      ".gql",
      // 文档文件
      ".tex",
      ".latex",
      ".bib",
    ];

    // 检查文件名是否匹配任何可编辑模式
    return editablePatterns.some((pattern) => {
      // 如果是完整文件名模式（如 webpack.config.js）
      if (!pattern.startsWith(".")) {
        return lowerFileName === pattern;
      }
      // 如果是扩展名模式
      return lowerFileName.endsWith(pattern);
    });
  };

  // 返回状态和方法
  return {
    uploading,
    fileProgressMap,
    uploadFiles, // 待上传文件列表
    getFileProgress,
    uploadSmallFile,
    uploadLargeFile,
    submitUpload,
    resetUploadStatus,
    saveNewFile,
    saveNewDirectory,
    deleteFiles,
    getFileContent,
    saveFileContent,
    getFileTree,
    isEditableFile,
  };
});
