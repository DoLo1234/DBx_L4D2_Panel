/**
 * 插件管理路由模块
 * 处理插件安装、卸载、列表获取等相关API请求
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
} from "../utils/responseHandler.js";
import pluginManager from "../services/pluginManager.js";

const router = express.Router();

// 获取当前模块的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 确保数据目录存在
 */
async function ensureDataDirectory() {
  try {
    await tools.ensureDirectoryExists(config.dataPath);
  } catch (error) {
    logger.plugin.error(`确保数据目录存在失败: ${error.message}`);
  }
}

// 初始化时调用
ensureDataDirectory();

/**
 * 安装插件路由
 * 安装指定的插件
 * @route POST /api/plugin/install
 * @group 插件管理 - 插件管理
 * @param {Object} request.body.required - 插件安装信息
 * @param {string} request.body.name.required - 插件名称
 * @param {string} request.body.server.required - 服务器名称
 * @returns {Object} 200 - 安装成功消息
 * @returns {Error} 500 - 服务器内部错误
 */
router.post("/install", authenticate, async (req, res) => {
  try {
    const { name, server } = req.body;
    logger.plugin.info(`开始安装插件: ${name}, 服务器: ${server}`);

    // 安装插件
    const result = await pluginManager.installPlugin(name, server);
    console.log("安装插件结果:", result);
    if (result.success) {
      logger.plugin.info(`插件 ${name} 安装成功`);
      sendSuccessResponse(res, null, `插件 ${name} 安装成功`);
    } else {
      logger.plugin.warn(`插件 ${name} 安装失败: ${result.message}`);
      sendErrorResponse(res, result.message);
    }
  } catch (error) {
    logger.plugin.error(`安装插件错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 卸载插件路由
 * 卸载指定的插件
 * @route POST /api/plugin/uninstall
 * @group 插件管理 - 插件管理
 * @param {Object} request.body.required - 插件卸载信息
 * @param {string} request.body.name.required - 插件名称
 * @param {string} request.body.server.required - 服务器名称
 * @returns {Object} 200 - 卸载成功消息
 * @returns {Error} 500 - 服务器内部错误
 */
router.delete("/uninstall", authenticate, async (req, res) => {
  try {
    const { name, server } = req.body;
    logger.plugin.info(`开始卸载插件: ${name}, 服务器: ${server}`);

    // 卸载插件
    const result = await pluginManager.uninstallPlugin(name, server);

    if (result.success) {
      logger.plugin.info(`插件 ${name} 卸载成功`);
      sendSuccessResponse(res, null, `插件 ${name} 卸载成功`);
    } else {
      logger.plugin.warn(`插件 ${name} 卸载失败: ${result.message}`);
      sendErrorResponse(res, result.message);
    }
  } catch (error) {
    logger.plugin.error(`卸载插件错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 获取已安装插件列表路由
 * 获取当前已安装的插件列表
 * @route GET /api/plugin/installed
 * @group 插件管理 - 插件管理
 * @returns {Object} 200 - 已安装插件列表
 * @returns {Error} 500 - 服务器内部错误
 */
router.get("/installed", authenticate, async (req, res) => {
  try {
    const { server } = req.query;
    logger.plugin.info(`获取已安装插件列表: ${server}`);

    // 获取已安装的插件列表
    const plugins = await pluginManager.getInstalledPlugins(server);

    sendSuccessResponse(res, { plugins }, "获取已安装插件列表成功");
  } catch (error) {
    logger.plugin.error(`获取已安装插件列表错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 获取可用插件列表路由
 * 获取可用的插件列表
 * @route GET /api/plugin/available
 * @group 插件管理 - 插件管理
 * @returns {Object} 200 - 可用插件列表
 * @returns {Error} 500 - 服务器内部错误
 */
router.get("/available", authenticate, async (req, res) => {
  try {
    // logger.plugin.info("获取可用插件列表");

    // 获取可用的插件列表
    const plugins = await pluginManager.getAvailablePlugins();

    sendSuccessResponse(res, { plugins }, "获取可用插件列表成功");
  } catch (error) {
    logger.plugin.error(`获取可用插件列表错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 获取插件概览数据路由
 * 获取插件的统计信息
 * @route GET /api/plugin/overview
 * @group 插件管理 - 插件管理
 * @returns {Object} 200 - 插件概览数据
 * @returns {Error} 500 - 服务器内部错误
 */
router.get("/overview", authenticate, async (req, res) => {
  try {
    // logger.plugin.info("获取插件概览数据");

    // 获取插件概览数据
    const overview = await pluginManager.getPluginsOverview();

    sendSuccessResponse(res, overview, "获取插件概览数据成功");
  } catch (error) {
    logger.plugin.error(`获取插件概览数据错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

export default router;
