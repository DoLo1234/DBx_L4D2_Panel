import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import authenticate from "../middleware/auth.js";
import config from "../config/index.js";
import logger from "../utils/logger.js";

import {
  sendSuccessResponse,
  sendErrorResponse,
} from "../utils/responseHandler.js";
import mapManager from "../services/mapManager.js";

const router = express.Router();

/**
 * 获取地图文件树
 */
router.get("/files", authenticate, (req, res) => {
  try {
    const { path: requestedPath } = req.query;
    const fileTree = mapManager.generateMapTree(requestedPath);
    sendSuccessResponse(res, { files: fileTree }, "获取地图文件树成功");
  } catch (error) {
    logger.server.error(`获取地图文件树错误: ${error.message}`);
    if (error.message === "目录不存在") {
      sendErrorResponse(res, error.message, 404);
    } else {
      sendErrorResponse(res, error.message, 500);
    }
  }
});

/**
 * 删除地图
 */
router.delete("/map", authenticate, async (req, res) => {
  try {
    const { mapName } = req.body;

    if (!mapName) {
      return sendErrorResponse(res, "地图名称不能为空", 400);
    }

    await mapManager.deleteMap(mapName);
    sendSuccessResponse(res, null, "地图删除成功");
  } catch (error) {
    logger.server.error(`删除地图错误: ${error.message}`);
    if (error.message === "地图名称不能为空") {
      sendErrorResponse(res, error.message, 400);
    } else if (error.message === "地图不存在") {
      sendErrorResponse(res, error.message, 404);
    } else {
      sendErrorResponse(res, error.message, 500);
    }
  }
});

/**
 * 分配地图到服务器
 */
router.post("/assign", authenticate, async (req, res) => {
  try {
    const { mapName, serverName } = req.body;

    if (!mapName || !serverName) {
      return sendErrorResponse(res, "地图名称和服务器名称不能为空", 400);
    }

    const result = await mapManager.assignMapToServer(mapName, serverName);
    sendSuccessResponse(res, result, "分配地图到服务器成功");
  } catch (error) {
    logger.server.error(`分配地图错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 取消分配地图从服务器
 */
router.delete("/unassign", authenticate, async (req, res) => {
  try {
    const { mapName, serverName } = req.body;
    if (!mapName || !serverName) {
      return sendErrorResponse(res, "地图名称和服务器名称不能为空", 400);
    }

    const result = await mapManager.removeMapFromServer(mapName, serverName);
    sendSuccessResponse(res, result, "取消分配地图成功");
  } catch (error) {
    logger.server.error(`移除地图错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});
/**
 * 解压地图
 */
router.post("/extract", authenticate, async (req, res) => {
  try {
    const { mapName, deleteSource = false } = req.body;
    if (!mapName) {
      return sendErrorResponse(res, "地图名称不能为空", 400);
    }

    // 构建地图文件路径
    const mapsPath = config.mapsPath;
    const zipFilePath = path.join(mapsPath, mapName);

    if (!fs.existsSync(zipFilePath)) {
      return sendErrorResponse(res, "地图文件不存在", 404);
    }

    const result = await mapManager.unzipMap(
      zipFilePath,
      mapsPath,
      deleteSource,
    );

    sendSuccessResponse(res, result, "解压地图成功");
  } catch (error) {
    logger.server.error(`解压地图错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 获取地图统计数据
 */
router.get("/overview", authenticate, async (req, res) => {
  try {
    const { serverName } = req.query;

    if (!serverName) {
      return sendErrorResponse(res, "服务器名称不能为空", 400);
    }

    const result = await mapManager.getMapsOverview(serverName);
    sendSuccessResponse(res, result, "获取地图统计数据成功");
  } catch (error) {
    logger.server.error(`获取地图统计数据错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

export default router;
