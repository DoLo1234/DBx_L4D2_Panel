import request from "../request";

/**
 * 文件管理相关API
 */
const fileApi = {
  /**
   * 获取文件树
   * @param {string} [path] - 目录路径（可选）
   * @returns {Promise} - 文件树
   */
  getFileTree(path = "") {
    return request({
      url: "/file/files",
      method: "get",
      params: { path },
    });
  },

  /**
   * 获取根目录大小
   * @returns {Promise} - 根目录大小
   */
  getRootDirectorySize() {
    return request({
      url: "/file/size",
      method: "get",
    });
  },

  /**
   * 获取文件内容
   * @param {string} filePath - 文件路径
   * @returns {Promise} - 文件内容
   */
  getFileContent(filePath) {
    return request({
      url: "/file/file",
      method: "get",
      params: { path: filePath },
    });
  },

  /**
   * 保存文件内容
   * @param {Object} data - 文件数据
   * @param {string} data.path - 文件路径
   * @param {string} data.content - 文件内容
   * @returns {Promise} - 保存结果
   */
  saveFileContent(data) {
    return request({
      url: "/file/file",
      method: "post",
      data,
    });
  },

  /**
   * 获取后端配置
   * @returns {Promise} - 后端配置
   */
  getBackendConfig() {
    return request({
      url: "/file/backendConfig",
      method: "get",
    });
  },

  /**
   * 上传文件
   * @param {FormData} formData - 表单数据，包含文件和路径
   * @param {Object} config - axios配置选项（如 onUploadProgress）
   * @returns {Promise} - 上传结果
   */
  uploadFile(formData, config = {}) {
    return request({
      url: "/file/upload",
      method: "post",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      ...config,
    });
  },

  /**
   * 初始化分块上传
   * @param {Object} data - 上传数据
   * @param {string} data.filename - 文件名
   * @param {number} data.totalSize - 文件总大小
   * @param {number} data.chunkSize - 分块大小
   * @param {number} data.totalChunks - 总分块数
   * @param {string} data.path - 上传目录路径
   * @returns {Promise} - 初始化结果
   */
  initChunkUpload(data) {
    return request({
      url: "/file/upload/init",
      method: "post",
      data,
    });
  },

  /**
   * 上传分块
   * @param {FormData} formData - 表单数据，包含分块文件和上传ID
   * @param {Object} config - axios配置选项
   * @returns {Promise} - 上传结果
   */
  uploadChunk(formData, config = {}) {
    return request({
      url: "/file/upload/chunk",
      method: "post",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 600000, // 分块上传超时时间10分钟
      ...config,
    });
  },

  /**
   * 获取上传状态
   * @param {string} uploadId - 上传ID
   * @returns {Promise} - 上传状态
   */
  getUploadStatus(uploadId) {
    return request({
      url: "/file/upload/status",
      method: "get",
      params: { uploadId },
    });
  },

  /**
   * 创建文件
   * @param {Object} data - 文件数据
   * @param {string} data.path - 文件路径
   * @param {string} data.content - 文件内容
   * @returns {Promise} - 创建结果
   */
  createFile(data) {
    return request({
      url: "/file/file",
      method: "post",
      data,
    });
  },

  /**
   * 创建文件夹
   * @param {string} directoryPath - 文件夹路径
   * @returns {Promise} - 创建结果
   */
  createDirectory(directoryPath) {
    return request({
      url: "/file/directory",
      method: "post",
      data: { path: directoryPath },
    });
  },

  /**
   * 删除文件或文件夹
   * @param {string} filePath - 文件或文件夹路径
   * @returns {Promise} - 删除结果
   */
  deleteFile(filePath) {
    return request({
      url: "/file/file",
      method: "delete",
      params: { path: filePath },
    });
  },

  /**
   * 取消上传
   * @param {Object} data - 上传数据
   * @param {string} data.uploadId - 上传ID
   * @returns {Promise} - 取消结果
   */
  cancelUpload(data) {
    return request({
      url: "/file/upload/cancel",
      method: "post",
      data,
    });
  },
};

export default fileApi;
