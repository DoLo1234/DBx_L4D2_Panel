/**
 * 服务器管理路由模块
 * 处理服务器部署、实例管理等相关API请求
 */
import express from "express";
import fs from "fs";
import path from "path";

// 导入共享模块
import authenticate from "../middleware/auth.js";
import config from "../config/index.js";
import logger from "../utils/logger.js";
import tools from "../utils/tools.js";

import {
  sendSuccessResponse,
  sendErrorResponse,
} from "../utils/responseHandler.js";
import steamcmdService from "../services/steamcmd.js";
import instanceManager from "../services/instanceManager.js";
import pluginManager from "../services/pluginManager.js";
import serverQueryService from "../services/serverQueryService.js";

const router = express.Router();

// 部署状态文件路径
const deployStatusPath = path.join(config.dataPath, "deploy-status.json");

// 服务器目录（使用配置中的SERVER_PATH）
const serversDir = config.serverPath;

/**
 * 确保数据目录存在
 */
async function ensureDataDirectory() {
  try {
    await tools.ensureDirectoryExists(config.dataPath);
  } catch (error) {
    logger.server.error(`确保数据目录存在失败: ${error.message}`);
  }
}

// 初始化时调用
ensureDataDirectory();

/**
 * 从文件加载部署状态
 * @returns {Object} 部署状态对象
 */
function loadDeployStatus() {
  try {
    if (fs.existsSync(deployStatusPath)) {
      const data = fs.readFileSync(deployStatusPath, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    logger.server.error(`加载部署状态失败: ${error.message}`);
  }
  // 默认状态
  return {
    status: "idle", // idle, in_progress, completed, failed, cancelled
    logs: [],
    process: null,
  };
}

/**
 * 保存部署状态到文件
 * @param {Object} status 部署状态对象
 */
async function saveDeployStatus(status) {
  try {
    // 不保存process对象，因为它是不可序列化的
    const statusToSave = {
      status: status.status,
      logs: status.logs,
    };
    await tools.writeJsonFile(deployStatusPath, statusToSave);
  } catch (error) {
    logger.server.error(`保存部署状态失败: ${error.message}`);
  }
}

// 存储部署状态和日志
global.deployStatus = loadDeployStatus();

// 暴露saveDeployStatus函数到全局作用域，以便steamcmd.js可以访问
global.saveDeployStatus = saveDeployStatus;

/**
 * 服务器状态路由
 * 获取服务器的当前状态信息
 * @route GET /api/server/status
 * @group 服务器管理 - 服务器状态管理
 * @returns {Object} 200 - 服务器状态信息
 * @returns {Error} 500 - 服务器内部错误
 */
router.get("/status", authenticate, async (req, res) => {
  try {
    // 检查服务器是否已部署
    const serverExists = await steamcmdService.verifyServer();
    logger.server.info(
      `服务器部署状态检查: ${serverExists ? "已部署" : "未部署"}`,
    );

    // 检查实例总数
    const allInstances = await instanceManager.getInstances();
    // console.log("已安装的实例数：", allInstances);
    // 这里可以添加更多状态检查逻辑

    // 获取运行中的实例数量
    const getInstances = await instanceManager.getAllInstancesStatus();
    const runningInstances = getInstances.filter(
      (i) => i.status === "running",
    ).length;

    // 获取已安装的插件数量
    const installedPlugins = await pluginManager.getTotalPluginsCount();

    sendSuccessResponse(
      res,
      {
        serverExists,
        allInstances: allInstances.length,
        runningInstances,
        installedPlugins,
      },
      "获取服务器状态成功",
    );
  } catch (error) {
    logger.server.error(`服务器状态检查错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 部署服务器路由
 * 部署或更新L4D2服务器
 * @route POST /api/server/deploy
 * @group 服务器管理 - 服务器部署管理
 * @param {Object} request.body.required - 部署参数
 * @param {string} request.body.steamUser - Steam用户名
 * @param {string} request.body.steamPassword - Steam密码
 * @returns {Object} 200 - 部署开始消息
 * @returns {Error} 500 - 服务器内部错误
 */
router.post("/deploy", authenticate, async (req, res) => {
  try {
    // 检查是否已经在部署中
    if (global.deployStatus.status === "in_progress") {
      // 保存部署状态
      // saveDeployStatus(global.deployStatus);
      return sendSuccessResponse(
        res,
        { status: "in_progress" },
        "部署已经在进行中",
      );
    }

    const { steamUser, steamPassword, interactive } = req.body;

    // 初始化部署状态
    global.deployStatus = {
      status: "in_progress",
      logs: [],
      process: null,
    };
    global.deployStatus.logs.push(`[${tools.formatTime()}] 开始部署服务器`);
    global.deployStatus.logs.push(
      `[${tools.formatTime()}] 使用Steam用户: ${steamUser || "anonymous"}`,
    );
    // 保存部署状态
    // saveDeployStatus(global.deployStatus);

    // 由于这是一个耗时操作，我们先返回开始部署的消息
    sendSuccessResponse(res, { status: "in_progress" }, "服务器部署已开始");

    // 获取服务器名称
    const serverName = req.body.serverName;

    // 异步执行部署操作
    steamcmdService
      .deployServer(steamUser, steamPassword, serverName, interactive)
      .then((result) => {
        global.deployStatus.logs.push(
          `[${tools.formatTime()}] 服务器部署成功完成`,
        );
        global.deployStatus.status = "completed";
        // 保存部署状态
        // saveDeployStatus(global.deployStatus);
        logger.server.info("服务器部署成功完成");
      })
      .catch((error) => {
        global.deployStatus.logs.push(
          `[${tools.formatTime()}] 服务器部署失败: ${error.message}`,
        );
        global.deployStatus.status = "failed";
        // 保存部署状态
        // saveDeployStatus(global.deployStatus);
        logger.server.error(`服务器部署失败: ${error.message}`);
      });
  } catch (error) {
    global.deployStatus.logs.push(
      `[${tools.formatTime()}] 服务器部署失败: ${error.message}`,
    );
    global.deployStatus.status = "failed";
    // 保存部署状态
    // saveDeployStatus(global.deployStatus);
    logger.server.error(`服务器部署错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 取消部署路由
 * 取消正在进行的服务器部署操作
 * @route POST /api/server/deploy/cancel
 * @group 服务器管理 - 服务器部署管理
 * @returns {Object} 200 - 取消部署消息
 * @returns {Error} 500 - 服务器内部错误
 */
router.post("/deploy/cancel", authenticate, async (req, res) => {
  try {
    // 取消部署
    await steamcmdService.cancelDeploy();

    logger.server.info("服务器部署已取消");
    sendSuccessResponse(res, { status: "cancelled" }, "部署已取消");
  } catch (error) {
    logger.server.error(`取消部署错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 获取部署日志路由
 * 获取服务器部署的日志信息
 * @route GET /api/server/deploy/logs
 * @group 服务器管理 - 服务器部署管理
 * @returns {Object} 200 - 部署日志信息
 * @returns {Error} 500 - 服务器内部错误
 */
router.get("/deploy/logs", authenticate, async (req, res) => {
  try {
    const obj = {
      logs: global.deployStatus.logs,
      status: global.deployStatus.status,
    };
    sendSuccessResponse(res, obj, "获取部署日志成功");
  } catch (error) {
    logger.server.error(`获取部署日志错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 获取实例列表路由
 * 获取所有服务器实例及其状态
 * @route GET /api/server/instances
 * @group 服务器管理 - 实例管理
 * @returns {Object} 200 - 实例列表信息
 * @returns {Error} 500 - 服务器内部错误
 */
router.get("/instances", authenticate, async (req, res) => {
  try {
    // 获取所有实例及其状态
    const instances = await instanceManager.getAllInstancesStatus();

    sendSuccessResponse(res, instances, "获取实例列表成功");
  } catch (error) {
    logger.server.error(`获取实例列表错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 启动实例路由
 * 启动指定的服务器实例
 * @route POST /api/server/instances/{name}/start
 * @group 服务器管理 - 实例管理
 * @param {string} name.path.required - 实例名称
 * @returns {Object} 200 - 启动成功消息
 * @returns {Error} 500 - 服务器内部错误
 */
router.post("/instances/start", authenticate, async (req, res) => {
  try {
    const InstanceObj = req.body;
    logger.server.info(`启动服务器实例: ${InstanceObj.name}`);

    // 启动实例
    const result = await instanceManager.startInstance(InstanceObj);

    sendSuccessResponse(res, null, result.message);
  } catch (error) {
    logger.server.error(`启动实例错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 停止实例路由
 * 停止指定的服务器实例
 * @route POST /api/server/instances/stop
 * @group 服务器管理 - 实例管理
 * @param {Object} name.path.required - 实例对象
 * @returns {Object} 200 - 停止成功消息
 * @returns {Error} 500 - 服务器内部错误
 */
router.post("/instances/stop", authenticate, async (req, res) => {
  try {
    const InstanceObj = req.body;
    logger.server.info(`停止服务器实例: ${InstanceObj.name}`);

    // 停止实例
    const result = await instanceManager.stopInstance(InstanceObj);

    sendSuccessResponse(res, null, result.message);
  } catch (error) {
    logger.server.error(`停止实例错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 添加实例路由
 * 添加新的服务器实例
 * @route POST /api/server/instances
 * @group 服务器管理 - 实例管理
 * @param {Object} request.body.required - 实例配置信息
 * @param {string} request.body.name.required - 实例名称
 * @param {number} request.body.port.required - 实例端口
 * @param {string} request.body.hostName.required - 实例主机名
 * @param {number} request.body.maxPlayers.required - 最大玩家数
 * @param {string} request.body.startMap.required - 起始地图
 * @param {boolean} request.body.insecure.required - 是否禁用VAC验证
 * @param {string} request.body.gameMode.required - 游戏模式
 * @param {number} request.body.tickRate.required - 帧率
 * @param {string} request.body.extraParams - 额外参数
 * @returns {Object} 200 - 添加成功消息
 * @returns {Error} 500 - 服务器内部错误
 */
router.post("/instances", authenticate, async (req, res) => {
  try {
    const instanceConfig = req.body;
    logger.server.info(`添加新服务器实例: ${instanceConfig.name}`);

    // 添加实例
    const result = await instanceManager.addInstance(instanceConfig);

    sendSuccessResponse(res, null, result.message);
  } catch (error) {
    logger.server.error(`添加实例错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 编辑实例路由
 * 编辑指定的服务器实例的配置信息
 * @route PUT /api/server/instances/{name}
 * @group 服务器管理 - 实例管理
 * @param {string} name.path.required - 实例名称
 * @param {Object} request.body.required - 新的实例配置信息
 * @param {string} request.body.name.required - 实例名称
 * @param {number} request.body.port.required - 实例端口
 * @param {string} request.body.hostName.required - 实例主机名
 * @param {number} request.body.maxPlayers.required - 最大玩家数
 * @param {string} request.body.startMap.required - 起始地图
 * @param {boolean} request.body.insecure.required - 是否禁用VAC验证
 * @param {string} request.body.gameMode.required - 游戏模式
 * @param {number} request.body.tickRate.required - 帧率
 * @param {string} request.body.extraParams - 额外参数
 * @returns {Object} 200 - 编辑成功消息
 * @returns {Error} 500 - 服务器内部错误
 */

router.put("/instances/:name", authenticate, async (req, res) => {
  try {
    const { name } = req.params;
    const updatedInstanceConfig = req.body;
    logger.server.info(`编辑服务器实例: ${name}`);

    // 编辑实例
    const result = await instanceManager.editInstance(
      name,
      updatedInstanceConfig,
    );

    sendSuccessResponse(res, null, result.message);
  } catch (error) {
    logger.server.error(`编辑实例错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 删除实例路由
 * 删除指定的服务器实例
 * @route DELETE /api/server/instances/{name}
 * @group 服务器管理 - 实例管理
 * @param {string} name.path.required - 实例名称
 * @returns {Object} 200 - 删除成功消息
 * @returns {Error} 500 - 服务器内部错误
 */
router.delete("/instances/:name", authenticate, async (req, res) => {
  try {
    const { name } = req.params;
    logger.server.info(`删除服务器实例: ${name}`);

    // 删除实例
    const result = await instanceManager.deleteInstance(name);

    sendSuccessResponse(res, null, result.message);
  } catch (error) {
    logger.server.error(`删除实例错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 获取服务器数量
 * @route GET /api/server/count
 * @group 服务器管理 - 服务器管理
 * @returns {Object} 200 - 服务器数量
 * @returns {Error} 500 - 服务器内部错误
 */
router.get("/count", authenticate, async (req, res) => {
  try {
    console.log("获取服务器数量", serversDir);
    // 确保服务器目录存在
    await tools.ensureDirectoryExists(serversDir);

    // 读取服务器目录
    const serverDirs = fs.readdirSync(serversDir);
    const serverCount = serverDirs.filter((dir) => {
      const dirPath = path.join(serversDir, dir);

      // 检查是否是服务器目录
      if (!fs.statSync(dirPath).isDirectory() || !dir.startsWith("server")) {
        return false;
      }

      // 根据平台检查启动文件
      const isWindows = process.platform === "win32";
      const serverExe = isWindows ? "srcds.exe" : "srcds_run";
      const serverExePath = path.join(dirPath, serverExe);

      // 检查启动文件是否存在
      return fs.existsSync(serverExePath);
    }).length;

    sendSuccessResponse(res, { count: serverCount }, "获取服务器数量成功");
  } catch (error) {
    logger.server.error(`获取服务器数量错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 获取服务器列表
 * @route GET /api/server/list
 * @group 服务器管理 - 服务器管理
 * @returns {Object} 200 - 服务器列表
 * @returns {Error} 500 - 服务器内部错误
 */
router.get("/list", authenticate, async (req, res) => {
  try {
    // 确保服务器目录存在
    await tools.ensureDirectoryExists(serversDir);

    // 读取服务器目录
    const serverDirs = fs.readdirSync(serversDir);
    const servers = serverDirs
      .filter((dir) => {
        const dirPath = path.join(serversDir, dir);

        // 检查是否是服务器目录
        if (!fs.statSync(dirPath).isDirectory() || !dir.startsWith("server")) {
          return false;
        }

        // 根据平台检查启动文件
        const isWindows = process.platform === "win32";
        const serverExe = isWindows ? "srcds.exe" : "srcds_run";
        const serverExePath = path.join(dirPath, serverExe);

        // 检查启动文件是否存在
        return fs.existsSync(serverExePath);
      })
      .map((dir) => ({
        name: dir,
        path: path.join(serversDir, dir),
      }));
    console.log("打印服务器列表:", servers);
    sendSuccessResponse(res, { servers }, "获取服务器列表成功");
  } catch (error) {
    logger.server.error(`获取服务器列表错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 获取部署状态
 * @route GET /api/server/deploy/status
 * @group 服务器管理 - 服务器管理
 * @returns {Object} 200 - 部署状态
 * @returns {Error} 500 - 服务器内部错误
 */
router.get("/deploy/status", authenticate, (req, res) => {
  try {
    const deployStatus = loadDeployStatus();
    sendSuccessResponse(res, deployStatus, "获取部署状态成功");
  } catch (error) {
    logger.server.error(`获取部署状态错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 获取服务器信息
 * @route GET /api/server/info
 * @group 服务器管理 - 服务器管理
 * @param {string} host.query.required - 服务器IP地址
 * @param {number} port.query - 服务器端口，默认27015
 * @returns {Object} 200 - 服务器信息
 * @returns {Error} 500 - 服务器内部错误
 */
router.get("/info", authenticate, async (req, res) => {
  try {
    const { host, port = 27015 } = req.query;

    if (!host) {
      return sendErrorResponse(res, "服务器IP地址是必填项", 400);
    }

    const result = await serverQueryService.getServerInfo(host, parseInt(port));
    sendSuccessResponse(res, result, "获取服务器信息成功");
  } catch (error) {
    logger.server.error(`获取服务器信息错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 发送RCON命令
 * @route POST /api/server/rcon
 * @group 服务器管理 - 服务器管理
 * @param {Object} request.body.required - RCON命令参数
 * @param {string} request.body.host.required - 服务器IP地址
 * @param {number} request.body.port - 服务器端口，默认27015
 * @param {string} request.body.password.required - RCON密码
 * @param {string} request.body.command.required - 要执行的命令
 * @returns {Object} 200 - 命令执行结果
 * @returns {Error} 500 - 服务器内部错误
 */
router.post("/rcon", authenticate, async (req, res) => {
  try {
    const { host, port = 27015, password, command } = req.body;

    if (!host || !password || !command) {
      return sendErrorResponse(
        res,
        "服务器IP地址、RCON密码和命令是必填项",
        400,
      );
    }

    const result = await serverQueryService.sendRconCommand(
      host,
      parseInt(port),
      password,
      command,
    );
    sendSuccessResponse(res, result, "发送RCON命令成功");
  } catch (error) {
    logger.server.error(`发送RCON命令错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

/**
 * 发送部署命令
 * @route POST /api/server/deploy/command
 * @group 服务器管理 - 服务器部署管理
 * @param {Object} request.body.required - 命令参数
 * @param {string} request.body.command.required - 要执行的命令
 * @returns {Object} 200 - 命令发送结果
 * @returns {Error} 500 - 服务器内部错误
 */
router.post("/deploy/command", authenticate, async (req, res) => {
  try {
    const { command } = req.body;

    if (!command) {
      return sendErrorResponse(res, "命令不能为空", 400);
    }

    // 1. 检查部署状态（保留你的逻辑）
    if (global.deployStatus.status !== "in_progress") {
      return sendSuccessResponse(
        res,
        { status: global.deployStatus.status },
        "没有正在进行的部署操作",
      );
    }

    // 2. 增强检查：进程是否存活
    const deployProcess = global.deployStatus.process;
    if (!deployProcess || deployProcess.killed) {
      const errMsg = "部署进程已结束";
      global.deployStatus.logs.push(`[${tools.formatTime()}] ${errMsg}`);
      // saveDeployStatus(global.deployStatus);
      return sendErrorResponse(res, errMsg, 500);
    }

    // 3. 发送命令（可选：调用 steamcmdService 封装方法，或保留你的原有写法）
    // 方式1：用封装方法（推荐，统一错误处理）
    const sendSuccess = steamcmdService.sendDeployCommand(command);

    // 方式2：保留你的原有写法（仅补充换行）
    // deployProcess.stdin.write(command.trim() + "\n");
    // const sendSuccess = true;

    if (sendSuccess) {
      global.deployStatus.logs.push(
        `[${tools.formatTime()}] 发送命令: ${command}`,
      );
      // saveDeployStatus(global.deployStatus);
      // WebSocket 推送（保留你的逻辑）
      if (global.websocketService) {
        global.websocketService.sendDeployLog(
          `[${tools.formatTime()}] 发送命令: ${command}\n`,
        );
      }
      sendSuccessResponse(res, { command }, "命令已发送");
    } else {
      sendErrorResponse(res, "命令发送失败", 500);
    }
  } catch (error) {
    logger.server.error(`发送部署命令错误: ${error.message}`);
    sendErrorResponse(res, error.message, 500);
  }
});

export default router;
