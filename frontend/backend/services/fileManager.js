/**
 * 文件管理服务模块
 * 处理服务器文件的获取、查看、编辑等相关业务逻辑
 */
import fs from "fs";
import path from "path";

// 导入共享模块
import config from "../config/index.js";
import logger from "../utils/logger.js";
import tools from "../utils/tools.js";

// 文件管理服务类
class FileManager {
  constructor() {
    // 存储上传状态
    this.uploadStatus = {};
  }

  /**
   * 生成文件树
   * @param {string} requestedPath - 目录路径
   * @returns {Array} 文件树
   */
  async generateFileTree(requestedPath) {
    // 确定根目录
    const rootDir = requestedPath;
    // 检查根目录是否存在
    if (
      !(await tools.fileExists(rootDir)) ||
      !(await tools.statFile(rootDir)).isDirectory()
    ) {
      throw new Error("目录不存在");
    }

    const items = [];
    // 使用tools.traverseDirectory生成文件树，设置recursive为false实现按需加载
    await tools.traverseDirectory(
      rootDir,
      // 文件回调
      async (entryPath, entry, stats) => {
        // 跳过 .temp 文件夹中的文件
        if (entryPath.includes(".temp")) {
          return;
        }
        items.push({
          name: entry,
          type: "file",
          path: entryPath,
          size: stats.size,
        });
      },
      // 目录回调
      async (entryPath, entry) => {
        // 跳过 .temp 文件夹
        if (entry === ".temp") {
          return;
        }

        // 检查是否是服务器目录（包含启动文件）
        let isServer = false;
        if (entry.startsWith("server")) {
          // 根据平台检查启动文件
          const isWindows = process.platform === "win32";
          const serverExe = isWindows ? "srcds.exe" : "srcds_run";
          const serverExePath = path.join(entryPath, serverExe);
          isServer = await tools.fileExists(serverExePath);
        }
        items.push({
          name: entry,
          type: "directory",
          path: entryPath,
          isServer: isServer,
          children: [], // 延迟加载，不在这里递归生成
        });
      },
      false, // 设置recursive为false，只读取直接子项
    );

    return items;
  }

  /**
   * 获取文件内容
   * @param {string} filePath - 文件路径
   * @returns {string} 文件内容
   */
  async getFileContent(filePath) {
    if (!filePath) {
      throw new Error("文件路径不能为空");
    }

    // 检查文件是否存在
    if (
      !(await tools.fileExists(filePath)) ||
      !(await tools.statFile(filePath)).isFile()
    ) {
      throw new Error("文件不存在");
    }

    // 读取文件内容
    return await tools.readFile(filePath);
  }

  /**
   * 保存文件内容
   * @param {string} filePath - 文件路径
   * @param {string} content - 文件内容
   */
  async saveFileContent(filePath, content) {
    if (!filePath || content === undefined) {
      throw new Error("文件路径和内容不能为空");
    }

    // 确保文件目录存在
    const fileDir = path.dirname(filePath);
    await tools.ensureDirectoryExists(fileDir);

    // 写入文件内容
    await tools.writeFile(filePath, content);
  }

  /**
   * 计算目录大小
   * @param {string} dir - 目录路径
   * @returns {number} 目录大小（字节）
   */
  async calculateDirectorySize(dir) {
    return await tools.calculateDirectorySize(dir || config.serverPath);
  }

  /**
   * 获取后端配置
   * @returns {Object} 后端配置
   */
  getBackendConfig() {
    return config;
  }

  /**
   * 处理文件上传
   * @param {Array} files - 上传的文件列表
   * @returns {Object} 上传结果
   */
  handleFileUpload(files) {
    if (!files || files.length === 0) {
      throw new Error("没有文件被上传");
    }

    // 生成上传ID
    const uploadId = Date.now().toString();

    // 更新上传状态
    this.uploadStatus[uploadId] = {
      status: "completed",
      progress: 100,
      files: files.map((file) => ({
        filename: file.filename,
        path: file.path,
        size: file.size,
      })),
      timestamp: Date.now(),
    };

    // 设置状态过期时间（24小时后自动清理）
    setTimeout(
      () => {
        delete this.uploadStatus[uploadId];
      },
      24 * 60 * 60 * 1000,
    );

    return {
      uploadId,
      files: files.map((file) => file.filename),
    };
  }

  /**
   * 获取上传状态
   * @param {string} uploadId - 上传ID
   * @returns {Object} 上传状态
   */
  getUploadStatus(uploadId) {
    if (!uploadId) {
      throw new Error("上传ID不能为空");
    }

    if (!this.uploadStatus[uploadId]) {
      throw new Error("上传ID不存在");
    }

    return this.uploadStatus[uploadId];
  }

  /**
   * 初始化分块上传
   * @param {Object} data - 上传数据
   * @returns {Object} 初始化结果
   */
  async initChunkUpload(data) {
    const { filename, totalSize, chunkSize, totalChunks, uploadPath } = data;
    console.log("初始化分块上传参数:", data);
    if (!filename || !totalSize || !chunkSize || !totalChunks || !uploadPath) {
      throw new Error("缺少必要的参数");
    }

    // 根据目录类型获取具体目录路径
    if (!uploadPath) {
      // 如果没有指定目录类型，直接取消上传
      throw new Error("缺少目录类型参数");
    }
    let finalUploadPath = uploadPath;

    if (!finalUploadPath) {
      console.log("最终上传路径:", finalUploadPath);
      throw new Error("上传路径无效");
    }
    console.log("最终上传路径:", finalUploadPath);
    // 检查上传路径
    try {
      await tools.ensureDirectoryExists(finalUploadPath);
    } catch (error) {
      throw new Error("上传路径无效");
    }

    // 生成上传ID
    const uploadId = Date.now().toString();

    // 创建临时目录存储分块
    const tempDir = path.join(config.serverPath, ".temp", uploadId);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 存储上传状态
    this.uploadStatus[uploadId] = {
      status: "initialized",
      progress: 0,
      filename,
      totalSize,
      chunkSize,
      totalChunks,
      uploadedChunks: 0,
      uploadPath: finalUploadPath,
      tempDir,
      timestamp: Date.now(),
    };

    // 设置状态过期时间（1小时后自动清理）
    setTimeout(
      () => {
        // 清理临时目录
        if (fs.existsSync(tempDir)) {
          try {
            fs.rmSync(tempDir, { recursive: true, force: true });
          } catch (e) {
            console.warn("清理临时目录失败:", e);
          }
        }
        delete this.uploadStatus[uploadId];
      },
      1 * 60 * 60 * 1000,
    );

    return { uploadId };
  }

  /**
   * 处理分块上传
   * @param {string} uploadId - 上传ID
   * @param {string} chunkIndex - 分块索引
   * @param {Object} chunkFile - 分块文件
   * @returns {Object} 上传结果
   */
  handleChunkUpload(uploadId, chunkIndex, chunkFile) {
    if (!uploadId || chunkIndex === undefined || !chunkFile) {
      throw new Error("缺少必要的参数");
    }

    if (!this.uploadStatus[uploadId]) {
      throw new Error("上传ID不存在");
    }

    const uploadInfo = this.uploadStatus[uploadId];
    const tempDir = uploadInfo.tempDir;

    try {
      // 保存分块文件
      const chunkPath = path.join(tempDir, `chunk_${chunkIndex}`);
      fs.renameSync(chunkFile.path, chunkPath);

      // 更新上传状态
      uploadInfo.uploadedChunks += 1;
      uploadInfo.progress = Math.round(
        (uploadInfo.uploadedChunks / uploadInfo.totalChunks) * 100,
      );
      uploadInfo.status = "uploading";

      // 检查是否所有分块都已上传
      if (uploadInfo.uploadedChunks === uploadInfo.totalChunks) {
        // 合并分块
        const targetPath = path.join(
          uploadInfo.uploadPath,
          uploadInfo.filename,
        );
        const targetDir = path.dirname(targetPath);

        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // 创建目标文件
        const writeStream = fs.createWriteStream(targetPath);

        // 处理写入流错误
        writeStream.on("error", (error) => {
          console.error("写入文件失败:", error);
          uploadInfo.status = "failed";
          uploadInfo.error = error.message;
          // 清理临时文件和目录
          this.cleanupUpload(uploadId);
        });

        // 合并分块
        let currentChunk = 0;
        const mergeChunks = () => {
          if (currentChunk < uploadInfo.totalChunks) {
            const chunkPath = path.join(tempDir, `chunk_${currentChunk}`);

            // 检查分块文件是否存在
            if (!fs.existsSync(chunkPath)) {
              const error = new Error(`分块文件不存在: chunk_${currentChunk}`);
              console.error(error.message);
              uploadInfo.status = "failed";
              uploadInfo.error = error.message;
              writeStream.destroy(error);
              this.cleanupUpload(uploadId);
              return;
            }

            const chunkStream = fs.createReadStream(chunkPath);

            // 处理读取流错误
            chunkStream.on("error", (error) => {
              console.error("读取分块文件失败:", error);
              uploadInfo.status = "failed";
              uploadInfo.error = error.message;
              writeStream.destroy(error);
              this.cleanupUpload(uploadId);
            });

            chunkStream.pipe(writeStream, { end: false });
            chunkStream.on("end", () => {
              currentChunk++;
              mergeChunks();
            });
          } else {
            writeStream.end();
            uploadInfo.status = "completed";
            uploadInfo.progress = 100;

            // 清理临时目录
            setTimeout(() => {
              this.cleanupUpload(uploadId);
            }, 1000);
          }
        };

        mergeChunks();
      }

      return {
        progress: uploadInfo.progress,
        status: uploadInfo.status,
      };
    } catch (error) {
      console.error("分块上传失败:", error);
      uploadInfo.status = "failed";
      uploadInfo.error = error.message;
      this.cleanupUpload(uploadId);
      throw error;
    }
  }

  /**
   * 清理上传相关的临时文件和状态
   * @param {string} uploadId - 上传ID
   */
  cleanupUpload(uploadId) {
    if (!this.uploadStatus[uploadId]) {
      return;
    }

    const uploadInfo = this.uploadStatus[uploadId];
    const tempDir = uploadInfo.tempDir;

    // 清理临时目录
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.warn("清理临时目录失败:", e);
      }
    }

    // 只在失败时立即删除状态，成功的话让 setTimeout 处理
    if (uploadInfo.status === "failed") {
      setTimeout(() => {
        delete this.uploadStatus[uploadId];
      }, 5000);
    }
  }

  /**
   * 创建文件夹
   * @param {string} directoryPath - 文件夹路径
   */
  async createDirectory(directoryPath) {
    if (!directoryPath) {
      throw new Error("文件夹路径不能为空");
    }

    // 确保目录不存在
    if (await tools.fileExists(directoryPath)) {
      throw new Error("文件夹已存在");
    }

    // 创建文件夹（包括所有父目录）
    await tools.ensureDirectoryExists(directoryPath);
  }

  /**
   * 删除文件或文件夹
   * @param {string} filePath - 文件或文件夹路径
   */
  async deleteFile(filePath) {
    if (!filePath) {
      throw new Error("文件路径不能为空");
    }

    // 检查文件是否存在
    if (!(await tools.fileExists(filePath))) {
      throw new Error("文件或文件夹不存在");
    }

    // 使用tools中的deleteRecursive方法
    await tools.deleteRecursive(filePath);
  }
}

// 导出文件管理服务实例
export default new FileManager();
