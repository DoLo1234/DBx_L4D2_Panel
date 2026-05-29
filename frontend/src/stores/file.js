import { defineStore } from "pinia";
import { ref } from "vue";
import { FileUploader } from "@/utils/fileUploader";
import { fileApi } from "@/api";

/**
 * 大文件阈值：超过此大小使用分块上传
 */
const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024;

/**
 * 默认分块大小
 */
const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;

/**
 * 最大并发上传数
 */
const MAX_UPLOAD_CONCURRENCY = 10;

/**
 * 分块大小预设值
 */
const CHUNK_SIZE_PRESETS = {
  SAVE_DATA: 128 * 1024, // 128KB - 省流量模式
  HIGH_RTT: 512 * 1024, // 512KB - 高延迟网络
  VERY_SLOW: 64 * 1024, // 64KB - 极慢网络
  MEDIUM: 5 * 1024 * 1024, // 5MB - 中等网络
  FAST: 10 * 1024 * 1024, // 10MB - 快速网络
};

/**
 * 根据网络状况获取合适的分块大小
 * 综合使用 Network Information API 的多个指标来判断网络质量
 * @param {Object} networkInfo - 网络信息对象
 * @param {boolean} networkInfo.saveData - 是否开启省流量模式
 * @param {number} networkInfo.rtt - 往返时间(ms)
 * @param {number} networkInfo.downlink - 下行速度(Mbps)
 * @returns {number} 分块大小（字节）
 */
const getOptimalChunkSize = (networkInfo) => {
  // 如果开启了省流量模式，使用较小的分块
  if (networkInfo.saveData) return CHUNK_SIZE_PRESETS.SAVE_DATA;

  // 根据 RTT (往返时间) 判断网络延迟，RTT > 500ms 认为是高延迟网络
  if (networkInfo.rtt && networkInfo.rtt > 500)
    return CHUNK_SIZE_PRESETS.HIGH_RTT;

  // 根据下行速度判断
  if (networkInfo.downlink !== undefined && networkInfo.downlink !== null) {
    if (networkInfo.downlink < 0.5) {
      // 小于 0.5 Mbps，极慢网络
      return CHUNK_SIZE_PRESETS.VERY_SLOW;
    } else if (networkInfo.downlink < 10) {
      // 0.5-10 Mbps，中等网络
      return CHUNK_SIZE_PRESETS.MEDIUM;
    } else {
      // 大于 10 Mbps，快速网络
      return CHUNK_SIZE_PRESETS.FAST;
    }
  }

  // 默认分块大小
  return DEFAULT_CHUNK_SIZE;
};

/**
 * 标准化上传路径，确保使用统一的正斜杠分隔符
 * @param {string} uploadPath - 上传路径
 * @param {string} relativePath - 文件相对路径
 * @returns {string} 标准化后的路径
 */
const normalizeUploadPath = (uploadPath, relativePath = "") => {
  let normalized = uploadPath.replace(/\\/g, "/");
  if (relativePath) {
    normalized = `${normalized}/${relativePath}`;
  }
  return normalized;
};

/**
 * 文件上传状态管理
 */
export const useFileStore = defineStore("file", () => {
  // 状态
  const uploading = ref(false);
  // 存储每个文件的进度信息
  const fileProgressMap = ref({});
  // 存储待上传的文件列表
  const uploadFiles = ref([]);

  /**
   * 更新文件进度信息（响应式更新）
   * @param {string} fileId - 文件唯一标识
   * @param {Object} updates - 要更新的字段
   */
  const updateFileProgress = (fileId, updates) => {
    fileProgressMap.value = {
      ...fileProgressMap.value,
      [fileId]: {
        ...fileProgressMap.value[fileId],
        ...updates,
      },
    };
  };

  /**
   * 初始化文件进度信息
   * @param {string} fileId - 文件唯一标识
   * @param {string} name - 文件名
   * @param {string} status - 初始状态
   */
  const initFileProgress = (fileId, name, status) => {
    fileProgressMap.value = {
      ...fileProgressMap.value,
      [fileId]: { progress: 0, status, name },
    };
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
    const normalizedPath = normalizeUploadPath(uploadPath, relativePath);

    initFileProgress(actualFileId, file.name, `上传中: ${file.name}`);

    try {
      await FileUploader.uploadSmallFile(file, {
        uploadPath: normalizedPath,
        onProgress: (progress) => {
          updateFileProgress(actualFileId, { progress });
        },
      });
      updateFileProgress(actualFileId, {
        progress: 100,
        status: `完成上传: ${file.name}`,
      });
    } catch (error) {
      console.error("上传失败:", error);
      updateFileProgress(actualFileId, {
        status: `上传失败: ${error.message}`,
      });
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
   * @param {Object} options - 上传选项
   * @param {number} options.chunkSize - 分块大小（默认5MB）
   * @param {boolean} options.enableResume - 是否启用断点续传（默认false）
   * @returns {Promise<void>}
   */
  const uploadLargeFile = async (
    file,
    uploadPath,
    relativePath = "",
    fileId,
    options = {},
  ) => {
    const actualFileId = fileId || file.name;
    const normalizedPath = normalizeUploadPath(uploadPath, relativePath);

    initFileProgress(actualFileId, file.name, "准备上传...");

    const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
    const enableResume = options.enableResume ?? false;

    try {
      await FileUploader.uploadLargeFile(file, {
        uploadPath: normalizedPath,
        chunkSize,
        maxConcurrency: MAX_UPLOAD_CONCURRENCY,
        enableResume,
        onProgress: (progress) => {
          updateFileProgress(actualFileId, { progress });
        },
        onStatus: (status) => {
          updateFileProgress(actualFileId, { status });
        },
        // 计算文件哈希用于断点续传
        onHashProgress: (progress) => {
          updateFileProgress(actualFileId, {
            status: `计算文件哈希进度: ${Math.round(progress * 100)}%`,
            progress: Math.round(progress * 100),
          });
        },
      });
      updateFileProgress(actualFileId, { progress: 100 });
    } catch (error) {
      console.error("上传失败:", error);
      updateFileProgress(actualFileId, {
        status: `上传失败: ${error.message}`,
      });
      throw error;
    }
  };

  /**
   * 提交文件上传
   * 使用并发上传池，最多同时10个上传任务，完成一个立即补充下一个
   * @param {Array} files - 文件列表
   * @param {string} uploadPath - 上传路径
   * @param {Function} onSuccess - 成功回调
   * @param {Function} onError - 错误回调
   * @param {Object} options - 上传选项
   * @param {number} options.largeFileThreshold - 大文件阈值（默认100MB）
   * @param {number} options.chunkSize - 自定义分块大小
   * @param {Object} options.networkInfo - 网络信息，用于自适应分块大小
   * @param {boolean} options.enableResume - 是否启用断点续传
   * @returns {Promise<void>}
   */
  const submitUpload = async (
    files,
    uploadPath,
    onSuccess,
    onError,
    options = {},
  ) => {
    if (files.length === 0) return;

    uploading.value = true;
    // 清空之前的进度信息
    fileProgressMap.value = {};

    const largeFileThreshold =
      options.largeFileThreshold || LARGE_FILE_THRESHOLD;
    const chunkSize =
      options.chunkSize || getOptimalChunkSize(options.networkInfo || {});
    const enableResume = options.enableResume ?? false;

    // 构建上传任务函数数组
    const taskFns = files.map((file) => {
      const rawFile = file.raw;
      const relativePath = file.relativePath || "";
      const fileId = file.uid || file.name;

      // 初始化文件进度
      initFileProgress(fileId, rawFile.name, "等待上传...");

      // 返回任务函数：大文件走分块上传，小文件走普通上传
      return () =>
        rawFile.size > largeFileThreshold
          ? uploadLargeFile(rawFile, uploadPath, relativePath, fileId, {
              chunkSize,
              enableResume,
            })
          : uploadSmallFile(rawFile, uploadPath, relativePath, fileId);
    });

    // 使用并发上传池执行
    const { errors } = await FileUploader.concurrentRun(taskFns, {
      maxConcurrency: MAX_UPLOAD_CONCURRENCY,
    });

    if (errors.length > 0) {
      console.error("部分文件上传失败:", errors);
      if (onError) {
        onError(new Error(`${errors.length} 个文件上传失败`));
      }
    } else {
      if (onSuccess) {
        onSuccess();
      }
    }

    uploading.value = false;
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
      const newFilePath = currentPath
        ? `${currentPath.replace(/\\/g, "/")}/${fileName}`
        : fileName;

      await fileApi.createFile({ path: newFilePath, content: "" });
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
      const newDirectoryPath = currentPath
        ? `${currentPath.replace(/\\/g, "/")}/${directoryName}`
        : directoryName;

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
      await fileApi.saveFileContent({ path: filePath, content });
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
    uploadFiles,
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
