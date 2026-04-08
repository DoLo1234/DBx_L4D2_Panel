import logger from "./logger.js";
import { sendErrorResponse } from "./responseHandler.js";

// 错误处理模块
class ErrorHandler {
  // 处理API错误
  static handleApiError(res, error, statusCode = 500) {
    // 记录错误日志
    logger.app.error(`${error.message}\n${error.stack}`);

    // 返回错误响应
    sendErrorResponse(
      res,
      error.message || "Internal Server Error",
      statusCode,
    );
  }

  // 处理服务错误
  static handleServiceError(error, serviceName) {
    // 记录错误日志
    logger.app.error(`[${serviceName}] ${error.message}\n${error.stack}`);

    // 重新抛出错误，让调用方处理
    throw error;
  }

  // 处理SteamCMD错误
  static handleSteamCmdError(error) {
    // 记录错误日志
    logger.steamcmd.error(`${error.message}\n${error.stack}`);

    // 重新抛出错误，让调用方处理
    throw error;
  }

  // 处理实例管理错误
  static handleInstanceError(error) {
    // 记录错误日志
    logger.instance.error(`${error.message}\n${error.stack}`);

    // 重新抛出错误，让调用方处理
    throw error;
  }

  // 处理插件管理错误
  static handlePluginError(error) {
    // 记录错误日志
    logger.plugin.error(`${error.message}\n${error.stack}`);

    // 重新抛出错误，让调用方处理
    throw error;
  }

  // 处理分配地图数据错误
  static handleAssignMapDataError(error) {
    // 记录错误日志
    logger.map.error(`${error.message}\n${error.stack}`);

    // 重新抛出错误，让调用方处理
    throw error;
  }
}

export default ErrorHandler;
