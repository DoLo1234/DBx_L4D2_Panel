/**
 * 认证路由模块
 * 处理用户登录、注销等认证相关API请求
 */
import express from "express";
import jwt from "jsonwebtoken";

// 导入共享模块
import logger from "../utils/logger.js";

import {
  sendSuccessResponse,
  sendErrorResponse,
} from "../utils/responseHandler.js";

const router = express.Router();

// 从环境变量获取用户凭据
const PANEL_USER = process.env.PANEL_USER || "admin";
const PANEL_PASSWORD = process.env.PANEL_PASSWORD || "admin";

/**
 * 登录路由
 * 用户登录并获取JWT令牌
 * @route POST /api/auth/login
 * @group 认证管理 - 认证相关操作
 * @param {Object} request.body.required - 登录参数
 * @param {string} request.body.username.required - 用户名
 * @param {string} request.body.password.required - 密码
 * @returns {Object} 200 - 登录成功消息和JWT令牌
 * @returns {Error} 401 - 用户名或密码错误
 * @returns {Error} 500 - 服务器内部错误
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证用户名
    if (username !== PANEL_USER) {
      logger.auth.warn(`登录尝试失败，用户名错误: ${username}`);
      return sendErrorResponse(res, "用户名或密码错误", 401);
    }

    // 验证密码（由于是明文存储在环境变量中，直接比较）
    if (password !== PANEL_PASSWORD) {
      logger.auth.warn(`登录尝试失败，密码错误`);
      return sendErrorResponse(res, "用户名或密码错误", 401);
    }

    // 生成JWT令牌
    const jwtSecret = process.env.JWT_SECRET || "secret_key";
    const token = jwt.sign({ username }, jwtSecret, { expiresIn: "24h" });

    logger.auth.info(`用户 ${username} 登录成功`);
    sendSuccessResponse(res, { token, username }, "登录成功");
  } catch (error) {
    logger.auth.error(`登录错误: ${error.message}`);
    sendErrorResponse(res, error.message, error.statusCode || 500);
  }
});

export default router;
