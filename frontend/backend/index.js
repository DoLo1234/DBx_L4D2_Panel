import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { styleText } from "util";

// Import shared modules
import config from "./config/index.js";
import logger from "./utils/logger.js";
import tools from "./utils/tools.js";
import errorHandler from "./utils/errorHandler.js";
import websocketService from "./services/websocketService.js";

// 创建Express应用
const app = express();

// 获取当前模块的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 中间件
app.use(
  cors({
    origin: "*", // 允许所有来源的请求，生产环境中应该设置具体的域名
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// 路由
import authRoutes from "./routes/auth.js";
import serverRoutes from "./routes/server.js";
import pluginRoutes from "./routes/plugin.js";
import logRoutes from "./routes/log.js";
import fileRoutes from "./routes/file.js";
import mapRoutes from "./routes/map.js";

app.use("/api/auth", authRoutes);
app.use("/api/server", serverRoutes);
app.use("/api/plugin", pluginRoutes);
app.use("/api/log", logRoutes);
app.use("/api/file", fileRoutes);
app.use("/api/map", mapRoutes);

// 颜色定义
const colorize = {
  green: (text) => styleText("green", text),
  yellow: (text) => styleText("yellow", text),
  blue: (text) => styleText("blue", text),
  red: (text) => styleText("red", text),
  cyan: (text) => styleText("cyan", text),
  magenta: (text) => styleText("magenta", text),
};

// 获取本地IP地址
const localIP = tools.getLocalIP();

// 启动信息
console.log(colorize.cyan("====================================="));
console.log(colorize.magenta("L4D2 管理器后端服务"));
console.log(colorize.cyan("====================================="));

// 检查前端构建目录
const frontendDistPath = path.join(__dirname, "../dist");
console.log(`${colorize.blue("[检查]")} 前端构建目录:`);
console.log(`  ${colorize.yellow("路径:")} ${frontendDistPath}`);

try {
  const stats = fs.statSync(frontendDistPath);
  // 打印所有环境变量
  console.log(
    `  ${colorize.yellow("环境变量:")} ${config.serverPath || "未设置"} ${colorize.yellow("SteamCMD:")} ${config.steamcmdPath || "未设置"}`,
  );

  console.log(
    `  ${colorize.yellow("状态:")} ${stats.isDirectory() ? colorize.green("✓ 存在") : colorize.red("✗ 不存在")}`,
  );

  // 检查index.html文件
  const indexHtmlPath = path.join(frontendDistPath, "index.html");
  const indexHtmlExists = fs.existsSync(indexHtmlPath);
  console.log(
    `  ${colorize.yellow("Index.html:")} ${indexHtmlExists ? colorize.green("✓ 存在") : colorize.red("✗ 不存在")}`,
  );

  if (indexHtmlExists) {
    console.log(
      `${colorize.blue("[服务]")} 静态文件服务: ${colorize.green("✓ 已启用")}`,
    );
  }
} catch (error) {
  console.log(`${colorize.yellow("[警告]")} 前端构建目录: ${error.message}`);
}

// 静态文件服务
try {
  app.use(express.static(frontendDistPath));
  console.log(
    `${colorize.blue("[服务]")} 静态文件服务中间件: ${colorize.green("✓ 已注册")}`,
  );
} catch (error) {
  console.log(`${colorize.yellow("[警告]")} 静态文件服务: ${error.message}`);
}

// 前端路由处理（单页应用）
app.use((req, res, next) => {
  // 检查是否是API请求
  if (req.originalUrl.startsWith("/api")) {
    next();
    return;
  }

  // 检查是否是健康检查
  if (req.originalUrl === "/health") {
    next();
    return;
  }

  // 忽略Vite开发工具请求
  if (req.originalUrl.startsWith("/@vite/")) {
    next();
    return;
  }

  // 只在开发模式下打印请求信息
  if (process.env.NODE_ENV !== "production") {
    console.log(`${colorize.blue("[请求]")} 前端: ${req.originalUrl}`);
  }

  try {
    const indexHtmlPath = path.join(frontendDistPath, "index.html");
    res.sendFile(indexHtmlPath);
  } catch (error) {
    console.error(`${colorize.red("[错误]")} 前端文件: ${error.message}`);
    res.status(500).json({
      error: "前端文件未找到",
      message: "请先构建前端应用",
    });
  }
});

// 健康检查
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// 错误处理
app.use((err, req, res, next) => {
  errorHandler.handleApiError(res, err);
});

// 启动服务器
const PORT = process.env.VITE_PORT || 11214;
const server = app.listen(PORT, () => {
  console.log(colorize.green("====================================="));
  console.log(`${colorize.green("[服务器]")} 服务启动成功!`);
  console.log(
    `${colorize.green("[服务器]")} 本地:   ${colorize.cyan(`http://localhost:${PORT}`)}`,
  );
  console.log(
    `${colorize.green("[服务器]")} 网络: ${colorize.cyan(`http://${localIP}:${PORT}`)}`,
  );
  console.log(
    `${colorize.green("[服务器]")} API:     ${colorize.cyan(`http://${localIP}:${PORT}/api`)}`,
  );
  console.log(colorize.green("====================================="));
  logger.app.info(`服务器已启动，监听端口: ${PORT} (IP: ${localIP})`);
});

// 初始化WebSocket服务
websocketService.init(server);

// 将WebSocket服务实例保存到全局变量，供其他模块使用
global.websocketService = websocketService;

// 处理SIGTERM信号（Docker容器停止时发送）
process.on("SIGTERM", () => {
  console.log(`${colorize.yellow("[SIGTERM]")} 收到终止信号，正在优雅关闭...`);

  // 立即杀死部署进程
  if (global.deployStatus && global.deployStatus.process) {
    console.log(`${colorize.yellow("[SIGTERM]")} 正在终止部署进程...`);
    try {
      // 使用SIGKILL信号强制杀死进程
      global.deployStatus.process.kill("SIGKILL");
      console.log(`${colorize.green("[SIGTERM]")} 部署进程已终止`);
    } catch (error) {
      console.error(
        `${colorize.red("[SIGTERM]")} 终止部署进程失败: ${error.message}`,
      );
    }
  }

  // 优雅关闭服务器
  console.log(`${colorize.yellow("[SIGTERM]")} 正在关闭服务器连接...`);
  server.close((err) => {
    if (err) {
      console.error(
        `${colorize.red("[SIGTERM]")} 关闭服务器失败: ${err.message}`,
      );
      process.exit(1);
    }
    console.log(`${colorize.green("[SIGTERM]")} 服务器已优雅关闭`);
    console.log(`${colorize.green("[SIGTERM]")} 正在退出`);
    process.exit(0);
  });

  // 设置超时，防止优雅关闭超时
  setTimeout(() => {
    console.log(`${colorize.red("[SIGTERM]")} 优雅关闭超时，立即退出`);
    process.exit(0);
  }, 5000);
});

// 处理SIGINT信号（Ctrl+C时发送）
process.on("SIGINT", () => {
  console.log(`${colorize.yellow("[SIGINT]")} 收到中断信号，正在关闭...`);
  process.emit("SIGTERM");
});

// 处理未捕获的错误
process.on("uncaughtException", (error) => {
  console.error(`${colorize.red("[错误]")} 未捕获的异常:`, error);
  // 这里可以添加更多的错误处理逻辑，例如重启服务
});

// 处理未处理的Promise拒绝
process.on("unhandledRejection", (reason, promise) => {
  console.error(`${colorize.red("[错误]")} 未处理的Promise拒绝:`, reason);
  // 这里可以添加更多的错误处理逻辑
});
