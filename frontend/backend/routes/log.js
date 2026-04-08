/**
 * 日志管理路由模块
 * 处理日志的获取、清空等相关API请求
 */
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// 导入共享模块
import authenticate from "../middleware/auth.js";
import config from "../config/index.js";
import logger from "../utils/logger.js";
import tools from "../utils/tools.js";

import {
  sendSuccessResponse,
  sendErrorResponse,
  sendPaginationResponse,
} from "../utils/responseHandler.js";

const router = express.Router();

// 获取当前模块的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 获取日志路由
 * 获取指定类型的日志信息
 * @route GET /api/log/get
 * @group 日志管理 - 日志相关操作
 * @param {string} type.query - 日志类型
 * @param {number} limit.query - 每页日志数量
 * @param {number} page.query - 页码
 * @returns {Object} 200 - 日志列表和总数
 * @returns {Error} 500 - 服务器内部错误
 */
router.get("/get", authenticate, (req, res) => {
  try {
    const { type, limit, page } = req.query;
    const logs = [];

    // 读取日志目录
    const logsPath = config.logsPath;
    console.log("steamcmd日志路径：", logsPath);
    if (fs.existsSync(logsPath)) {
      const logFiles = fs.readdirSync(logsPath);
      logFiles.forEach((file) => {
        if (file.endsWith(".log")) {
          // 根据类型过滤日志文件
          if (type && !file.includes(type)) {
            return;
          }

          const logPath = path.join(logsPath, file);
          const logContent = fs.readFileSync(logPath, "utf8");
          const logLines = logContent.split("\n");

          // 解析日志行
          logLines.forEach((line) => {
            if (line.trim()) {
              try {
                const logObj = JSON.parse(line);
                logs.push({
                  ...logObj,
                  file: file,
                });
              } catch (error) {
                // 忽略解析错误的日志行
              }
            }
          });
        }
      });
    }

    // 按时间倒序排序
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // 计算总日志数量
    const total = logs.length;

    // 处理分页
    const pageSize = limit ? parseInt(limit) : 20;
    const currentPage = page ? parseInt(page) : 1;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedLogs = logs.slice(startIndex, endIndex);

    sendPaginationResponse(
      res,
      paginatedLogs,
      total,
      currentPage,
      pageSize,
      "获取日志成功",
    );
  } catch (error) {
    logger.app.error(`获取日志错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 清空日志路由
 * 清空指定类型的日志文件
 * @route POST /api/log/clear
 * @group 日志管理 - 日志相关操作
 * @param {Object} request.body.required - 清空参数
 * @param {string} request.body.type - 日志类型
 * @returns {Object} 200 - 清空成功消息
 * @returns {Error} 500 - 服务器内部错误
 */
router.post("/clear", authenticate, (req, res) => {
  try {
    const { type } = req.body;

    // 读取日志目录
    const logsPath = config.logsPath;
    if (fs.existsSync(logsPath)) {
      const logFiles = fs.readdirSync(logsPath);
      logFiles.forEach((file) => {
        if (file.endsWith(".log")) {
          // 根据类型过滤日志文件
          if (type && !file.includes(type)) {
            return;
          }

          const logPath = path.join(logsPath, file);
          // 清空日志文件
          fs.writeFileSync(logPath, "");
        }
      });
    }

    logger.app.info(`清空日志类型: ${type || "all"}`);
    sendSuccessResponse(res, null, "日志清空成功");
  } catch (error) {
    logger.app.error(`清空日志错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

export default router;
