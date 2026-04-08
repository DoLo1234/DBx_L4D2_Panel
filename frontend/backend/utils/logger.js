import winston from "winston";
import path from "path";
import fs from "fs";
import config from "../config/index.js";

// 确保日志目录存在
if (!fs.existsSync(config.logsPath)) {
  fs.mkdirSync(config.logsPath, { recursive: true });
}

// 日志配置
const loggerConfig = {
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
};

// 创建不同模块的日志实例
function createLogger(moduleName) {
  return winston.createLogger({
    level: "info",
    format: loggerConfig.format,
    transports: [
      new winston.transports.File({
        filename: path.join(config.logsPath, `${moduleName}.log`),
      }),
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.simple(),
        ),
      }),
    ],
  });
}

// 导出不同模块的日志实例
export default {
  app: createLogger("app"),
  auth: createLogger("auth"),
  server: createLogger("server"),
  plugin: createLogger("plugin"),
  instance: createLogger("instance"),
  steamcmd: createLogger("steamcmd"),
  map: createLogger("map"),
  // 通用日志创建函数
  createLogger,
};
