/**
 * 认证中间件
 * 验证请求中的JWT令牌，确保用户已登录
 */
import jwt from "jsonwebtoken";

// 导入共享模块
import logger from "../utils/logger.js";
import errorHandler from "../utils/errorHandler.js";

/**
 * 认证中间件函数
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
const authenticate = (req, res, next) => {
  try {
    // 从请求头获取令牌
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "需要访问令牌" });
    }

    const token = authHeader.split(" ")[1];

    // 验证令牌
    const jwtSecret = process.env.JWT_SECRET || "secret_key";
    const decoded = jwt.verify(token, jwtSecret);

    // 将用户信息添加到请求对象
    req.user = decoded;

    // 只在开发环境记录详细认证日志，或者使用 debug 级别
    if (process.env.NODE_ENV === "development") {
      logger.auth.debug(`API 请求认证成功: ${decoded.username}`);
    }
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      logger.auth.warn("令牌已过期");
      return res.status(505).json({ error: "令牌已过期" });
    }
    logger.auth.warn("无效的令牌");
    return res.status(505).json({ error: "无效的令牌" });
  }
};

export default authenticate;
