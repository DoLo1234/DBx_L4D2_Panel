/**
 * 文件管理路由模块
 * 处理服务器文件的获取、查看、编辑等相关API请求
 */
import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";

// 导入共享模块
import authenticate from "../middleware/auth.js";
import config from "../config/index.js";
import logger from "../utils/logger.js";
import tools from "../utils/tools.js";

import {
  sendSuccessResponse,
  sendErrorResponse,
} from "../utils/responseHandler.js";
import fileManager from "../services/fileManager.js";

// 配置multer中间件处理文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 从请求中获取上传路径
    let fullPath = req.body.path || "";

    // 如果是分块上传，使用临时目录
    if (!fullPath && req.body.uploadId) {
      fullPath = path.join(config.serverPath, ".temp");
    }

    // 如果仍然没有路径，使用默认临时目录
    if (!fullPath) {
      fullPath = path.join(config.serverPath, ".temp");
    }

    // 确保目录存在
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    cb(null, fullPath);
  },
  filename: function (req, file, cb) {
    // 确保文件名使用正确的UTF-8编码
    // 处理Multer可能的编码问题
    let originalName = file.originalname;
    try {
      // 尝试从latin1转换为utf8
      originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
    } catch (e) {
      console.warn("文件名编码转换失败:", e);
    }
    // 分块上传时使用唯一文件名，避免并发上传时文件互相覆盖
    if (req.body.uploadId) {
      const ext = path.extname(originalName);
      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      cb(null, uniqueName);
    } else {
      // 替换 macOS/Linux/Windows 不允许的文件名特殊字符为下划线（保留最后一个.作为后缀分隔符）
      const lastDotIndex = originalName.lastIndexOf(".");
      let sanitizedName;
      if (lastDotIndex > 0) {
        const namePart = originalName
          .substring(0, lastDotIndex)
          .replace(/[<>:"/\\|?*\x00-\x1f.]/g, "_");
        const extPart = originalName.substring(lastDotIndex);
        sanitizedName = namePart + extPart;
      } else {
        sanitizedName = originalName.replace(/[<>:"/\\|?*\x00-\x1f.]/g, "_");
      }
      cb(null, sanitizedName);
    }
  },
});

// 配置multer，增加文件大小限制
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB 文件大小限制
  },
});

const router = express.Router();

/**
 * 获取文件树
 * @route GET /api/file/files
 * @group 文件管理 - 文件相关操作
 * @param {string} path.query - 目录路径（可选，指定服务器实例名称或子目录路径）
 * @returns {Object} 200 - 文件树
 * @returns {Error} 500 - 服务器内部错误
 */
router.get("/files", authenticate, async (req, res) => {
  try {
    // 获取路径参数
    const { path: requestedPath } = req.query;
    // 使用文件管理服务生成文件树
    const fileTree = await fileManager.generateFileTree(requestedPath);
    sendSuccessResponse(res, { files: fileTree }, "获取文件树成功");
  } catch (error) {
    logger.server.error(`获取文件树错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 获取文件内容
 * @route GET /api/file/file
 * @group 文件管理 - 文件相关操作
 * @param {string} path.query.required - 文件路径
 * @returns {Object} 200 - 文件内容
 * @returns {Error} 500 - 服务器内部错误
 */
router.get("/file", authenticate, async (req, res) => {
  try {
    const filePath = req.query.path;

    // 使用文件管理服务获取文件内容
    const content = await fileManager.getFileContent(filePath);
    sendSuccessResponse(res, { content }, "获取文件内容成功");
  } catch (error) {
    logger.server.error(`获取文件内容错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 保存文件内容
 * @route POST /api/file/file
 * @group 文件管理 - 文件相关操作
 * @param {string} path.body.required - 文件路径
 * @param {string} content.body.required - 文件内容
 * @returns {Object} 200 - 保存成功消息
 * @returns {Error} 500 - 服务器内部错误
 */
router.post("/file", authenticate, async (req, res) => {
  try {
    const { path: filePath, content } = req.body;

    // 使用文件管理服务保存文件内容
    await fileManager.saveFileContent(filePath, content);
    sendSuccessResponse(res, null, "文件保存成功");
  } catch (error) {
    logger.server.error(`保存文件内容错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 获取根目录大小
 * @route GET /api/file/size
 * @group 文件管理 - 文件相关操作
 * @returns {Object} 200 - 根目录大小
 * @returns {Error} 500 - 服务器内部错误
 */
router.get("/size", authenticate, async (req, res) => {
  try {
    // 使用文件管理服务计算目录大小
    const rootDirSize = await fileManager.calculateDirectorySize();

    sendSuccessResponse(res, { size: rootDirSize }, "获取目录大小成功");
  } catch (error) {
    logger.server.error(`获取目录大小错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 获取后端配置
 * @route GET /api/file/backendConfig
 * @group 文件管理 - 文件相关操作
 * @returns {Object} 200 - 后端配置
 * @returns {Error} 500 - 服务器内部错误
 */
router.get("/backendConfig", async (req, res) => {
  try {
    // 使用文件管理服务获取后端配置
    const configData = fileManager.getBackendConfig();
    const localIP = tools.getLocalIP();
    sendSuccessResponse(res, { ...configData, localIP }, "获取后端配置成功");
  } catch (error) {
    logger.server.error(`获取后端配置错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 上传文件
 * @route POST /api/file/upload
 * @group 文件管理 - 文件相关操作
 * @param {string} path.formData.required - 上传目录路径
 * @param {file} file.formData.required - 要上传的文件
 * @returns {Object} 200 - 上传成功消息
 * @returns {Error} 500 - 服务器内部错误
 */
router.post("/upload", authenticate, upload.array("file"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return sendErrorResponse(res, "没有文件被上传", 400);
    }

    // 使用文件管理服务处理文件上传
    const result = fileManager.handleFileUpload(req.files);

    sendSuccessResponse(
      res,
      { uploadId: result.uploadId, files: result.files },
      "文件上传成功",
    );
  } catch (error) {
    logger.server.error(`上传文件错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 获取上传状态
 * @route GET /api/file/upload/status
 * @group 文件管理 - 文件相关操作
 * @param {string} uploadId.query.required - 上传ID
 * @returns {Object} 200 - 上传状态
 * @returns {Error} 404 - 上传ID不存在
 * @returns {Error} 500 - 服务器内部错误
 */
router.get("/upload/status", authenticate, (req, res) => {
  try {
    const { uploadId } = req.query;

    // 使用文件管理服务获取上传状态
    const status = fileManager.getUploadStatus(uploadId);
    sendSuccessResponse(res, status, "获取上传状态成功");
  } catch (error) {
    logger.server.error(`获取上传状态错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 分块上传初始化
 * @route POST /api/file/upload/init
 * @group 文件管理 - 文件相关操作
 * @param {string} filename.body.required - 文件名
 * @param {number} totalSize.body.required - 文件总大小
 * @param {number} chunkSize.body.required - 分块大小
 * @param {number} totalChunks.body.required - 总分块数
 * @param {string} path.body - 上传目录路径（如果指定了directoryType，则可选）
 * @param {string} directoryType.body - 目录类型枚举：plugins, config, maps, addons
 * @returns {Object} 200 - 初始化成功消息
 * @returns {Error} 500 - 服务器内部错误
 */
router.post("/upload/init", authenticate, async (req, res) => {
  try {
    const { filename, totalSize, chunkSize, totalChunks, uploadPath } =
      req.body;

    // 使用文件管理服务初始化分块上传
    const result = await fileManager.initChunkUpload({
      filename,
      totalSize,
      chunkSize,
      totalChunks,
      uploadPath,
    });

    sendSuccessResponse(
      res,
      { uploadId: result.uploadId },
      "分块上传初始化成功",
    );
  } catch (error) {
    logger.server.error(`初始化分块上传错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 上传分块
 * @route POST /api/file/upload/chunk
 * @group 文件管理 - 文件相关操作
 * @param {string} uploadId.formData.required - 上传ID
 * @param {number} chunkIndex.formData.required - 分块索引
 * @param {file} chunk.formData.required - 分块文件
 * @returns {Object} 200 - 上传成功消息
 * @returns {Error} 500 - 服务器内部错误
 */
router.post(
  "/upload/chunk",
  authenticate,
  upload.single("chunk"),
  (req, res) => {
    try {
      const { uploadId, chunkIndex } = req.body;
      const chunkFile = req.file;

      // 使用文件管理服务处理分块上传
      const result = fileManager.handleChunkUpload(
        uploadId,
        chunkIndex,
        chunkFile,
      );

      sendSuccessResponse(
        res,
        { progress: result.progress, status: result.status },
        "分块上传成功",
      );
    } catch (error) {
      logger.server.error(`上传分块错误: ${error.message}`);
      sendErrorResponse(res, error.message, 500);
    }
  },
);

/**
 * 创建文件夹
 * @route POST /api/file/directory
 * @group 文件管理 - 文件相关操作
 * @param {string} path.body.required - 文件夹路径
 * @returns {Object} 200 - 创建成功消息
 * @returns {Error} 500 - 服务器内部错误
 */
router.post("/directory", authenticate, async (req, res) => {
  try {
    const { path: directoryPath } = req.body;

    // 使用文件管理服务创建文件夹
    await fileManager.createDirectory(directoryPath);
    sendSuccessResponse(res, null, "文件夹创建成功");
  } catch (error) {
    logger.server.error(`创建文件夹错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 删除文件或文件夹
 * @route DELETE /api/file/file
 * @group 文件管理 - 文件相关操作
 * @param {string} path.query.required - 文件或文件夹路径
 * @returns {Object} 200 - 删除成功消息
 * @returns {Error} 500 - 服务器内部错误
 */
router.delete("/file", authenticate, async (req, res) => {
  try {
    const filePath = req.query.path;

    // 使用文件管理服务删除文件
    await fileManager.deleteFile(filePath);
    sendSuccessResponse(res, null, "文件删除成功");
  } catch (error) {
    logger.server.error(`删除文件错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 取消上传
 * @route POST /api/file/upload/cancel
 * @group 文件管理 - 文件相关操作
 * @param {string} uploadId.body.required - 上传ID
 * @returns {Object} 200 - 取消成功消息
 * @returns {Error} 500 - 服务器内部错误
 */
router.post("/upload/cancel", authenticate, (req, res) => {
  try {
    const { uploadId } = req.body;
    // 使用文件管理服务清理上传
    fileManager.cleanupUpload(uploadId);
    sendSuccessResponse(res, null, "上传已取消");
  } catch (error) {
    logger.server.error(`取消上传错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

export default router;
