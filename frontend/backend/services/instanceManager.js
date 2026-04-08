import fs from "fs";
import path from "path";
// import { exec, spawn } from "child_process";
// import { promisify } from "util";

// 导入共享模块
import config from "../config/index.js";
import logger from "../utils/logger.js";
import tools from "../utils/tools.js";
import errorHandler from "../utils/errorHandler.js";
import {
  startServerInstance,
  stopServerInstance,
  getProcessList,
} from "../utils/processManager.js";

class InstanceManager {
  constructor() {
    this.serverPath = config.serverPath;
    this.instancesPath = config.instancesPath;
    this.instances = new Map(); // 存储运行中的实例

    // 确保实例配置目录存在
    this.ensureDirectoryExists();
  }

  // 确保目录存在
  async ensureDirectoryExists() {
    try {
      await tools.ensureDirectoryExists(this.instancesPath);
    } catch (error) {
      logger.instance.error(`确保实例配置目录存在失败: ${error.message}`);
    }
  }

  // 获取所有服务器实例配置
  async getInstances() {
    try {
      // 读取实例配置文件
      const instancesConfigPath = path.join(
        this.instancesPath,
        "instances.json",
      );

      // 确保实例配置文件存在
      if (!fs.existsSync(instancesConfigPath)) {
        // 如果文件不存在，创建一个空数组文件
        await tools.writeJsonFile(instancesConfigPath, []);
        return [];
      }
      // 直接返回实例配置，不添加默认值
      return await tools.readJsonFile(instancesConfigPath);
    } catch (error) {
      errorHandler.handleInstanceError(error);
      return [];
    }
  }

  /**
   * 启动服务器实例
   * @param {Object} instanceObj - 服务器实例对象
   * @returns {Promise<{success: boolean, message: string}>} - 启动结果
   */
  async startInstance(instanceObj) {
    try {
      // 获取实例配置
      const instances = await this.getInstances();
      const instance = instances.find((i) => i.name === instanceObj.name);
      console.log("当前实例：", instance);
      if (!instance) {
        throw new Error(`实例 ${instanceObj.name} 未找到`);
      }

      // 检查实例是否已经在运行
      if (this.instances.has(instanceObj.name)) {
        throw new Error(`实例 ${instanceObj.name} 已经在运行`);
      }

      // 检查当前端口是否已被占用
      const isPortOccupied = await tools.isPortOccupied(instance.port);
      if (isPortOccupied) {
        throw new Error(`端口 ${instance.port} 已经被占用`);
      }

      // 根据 serverId 确定服务器路径
      let serverPath = this.serverPath;
      if (instance.serverId) {
        serverPath = path.join(this.serverPath, instance.serverId);
      }

      // 检查服务器目录是否存在
      const isWindows = process.platform === "win32";
      const srcdsPath = isWindows
        ? path.join(serverPath, "srcds.exe")
        : path.join(serverPath, "srcds_run");
      if (!fs.existsSync(srcdsPath)) {
        throw new Error(`服务器文件未在 ${serverPath} 找到`);
      }

      logger.instance.info(
        `正在启动实例: ${instanceObj.name} 端口 ${instance.port}`,
      );

      // 构建启动命令
      const cmdArgs = [
        "-game",
        "left4dead2",
        "-console",
        "-ip",
        "0.0.0.0",
        "-port",
        instance.port,
        instance.gameMode,
        "-tickrate",
        instance.tickRate,
        "+map",
        instance.startMap,
        "+hostname",
        instance.hostName,
        "+maxplayers",
        instance.maxPlayers,
        instance.insecure,
        ...instance.extraParams.split(" ").filter((p) => p),
      ];

      // 打印格式化后的命令行参数
      // const formattedArgs = cmdArgs.map((arg) => arg.toString()).join(" ");
      // logger.instance.info(
      //   `Starting instance with command: ${srcdsPath} ${formattedArgs}`,
      // );

      // 使用进程管理工具启动实例（跨平台方案）

      // 打印启动配置信息（调试用）
      logger.instance.info(`服务器路径: ${serverPath}`);
      logger.instance.info(`Srcds路径: ${srcdsPath}`);
      logger.instance.info(`命令参数: ${cmdArgs.join(" ")}`);
      logger.instance.info(`是否Windows: ${isWindows}`);

      // 启动实例
      try {
        // 构建启动选项
        const startOptions = {
          name: instanceObj.name,
          srcdsPath: srcdsPath,
          cmdArgs: cmdArgs,
          serverPath: serverPath,
        };
        // 使用统一的启动方法
        const processInfo = await startServerInstance(startOptions);
        logger.instance.info(
          `实例 ${instanceObj.name} 已启动，PID: ${processInfo.pid}`,
        );

        // 存储实例信息
        this.instances.set(instanceObj.name, {
          process: null,
          pid: processInfo.pid,
          name: instanceObj.name,
          port: instanceObj.port,
          status: instanceObj.status,
        });
      } catch (error) {
        logger.instance.error(`启动实例失败: ${error.message}`);
      }

      logger.instance.info(`实例 ${instanceObj.name} 启动成功`);
      return { success: true, message: `实例 ${instanceObj.name} 启动成功` };
    } catch (error) {
      logger.instance.error(`启动实例错误: ${error.message}`);
      throw error;
    }
  }

  /**
   * 停止服务器实例
   * @param {Object} instance - 服务器实例对象
   * @returns {Promise<{success: boolean, message: string}>} - 停止结果
   */
  async stopInstance(instanceObj) {
    try {
      // 检查实例是否在运行
      if (!this.instances.has(instanceObj.name)) {
        throw new Error(`实例 ${instanceObj.name} 未运行`);
      }
      // 检查实例是否在运行
      const instanceInfo = this.instances.get(instanceObj.name);
      logger.instance.info(
        `正在停止实例: ${instanceObj.name} 端口 ${instanceInfo.port} 状态 ${instanceInfo.status}`,
      );

      // 使用统一的停止方法
      try {
        const stopOptions = {
          name: instanceInfo.name,
        };

        const success = await stopServerInstance(stopOptions);

        if (success) {
          logger.instance.info(`成功停止实例 ${instanceObj.name}`);
        } else {
          logger.instance.error(`停止实例 ${instanceObj.name} 失败`);
        }
      } catch (error) {
        logger.instance.error(`停止实例失败: ${error.message}`);
      }

      // 等待1.5秒让所有进程有时间终止
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 从存储中移除
      this.instances.delete(instanceObj.name);
      logger.instance.info(`从存储中移除实例 ${instanceObj.name}`);

      logger.instance.info(`实例 ${instanceObj.name} 停止成功`);
      return { success: true, message: `实例 ${instanceObj.name} 停止成功` };
    } catch (error) {
      logger.instance.error(`停止实例错误: ${error.message}`);
      throw error;
    }
  }

  // 获取实例状态
  async getInstanceStatus(instanceName) {
    try {
      const processes = await getProcessList();
      const targetProcess = processes.find((p) => p.name === instanceName);
      if (targetProcess && targetProcess.status === "online") {
        // 同步内存状态
        this.instances.set(instanceName, {
          pid: targetProcess.pid,
          name: instanceName,
          port: this.instances.get(instanceName)?.port || null,
          status: this.instances.get(instanceName)?.status || "stopped",
        });
        return "running";
      } else {
        this.instances.delete(instanceName);
        return "stopped";
      }
    } catch (error) {
      logger.instance.error(`获取实例状态失败: ${error.message}`);
      // 直接返回失败状态
      return "failed";
    }
  }

  // 获取所有实例状态
  async getAllInstancesStatus() {
    try {
      const instances = await this.getInstances();
      const instancesWithStatus = await Promise.all(
        instances.map(async (instance) => ({
          ...instance,
          status: await this.getInstanceStatus(instance.name),
        })),
      );
      return instancesWithStatus;
    } catch (error) {
      logger.instance.error(`Get all instances status error: ${error.message}`);
      return [];
    }
  }

  // 添加新实例
  async addInstance(instanceConfig) {
    try {
      // 获取现有实例
      const instances = await this.getInstances();

      // 检查实例名是否已存在
      if (
        instances.some(
          (i) =>
            i.name === instanceConfig.name || i.port === instanceConfig.port,
        )
      ) {
        return {
          success: false,
          message: `实例名称 ${instanceConfig.name} 或端口 ${instanceConfig.port} 已存在`,
        };
      }

      // 添加新实例
      instances.push({
        ...instanceConfig,
        status: "stopped",
      });

      // 保存实例配置
      const instancesConfigPath = path.join(
        this.instancesPath,
        "instances.json",
      );
      await tools.writeJsonFile(instancesConfigPath, instances);

      logger.instance.info(`添加新实例: ${instanceConfig.name}`);
      return { success: true, message: `实例 ${instanceConfig.name} 添加成功` };
    } catch (error) {
      errorHandler.handleInstanceError(error);
    }
  }

  // 编辑实例
  async editInstance(instanceName, updatedInstanceConfig) {
    try {
      // 获取现有实例
      const instances = await this.getInstances();

      // 检查实例是否存在
      const instanceIndex = instances.findIndex((i) => i.name === instanceName);
      if (instanceIndex === -1) {
        return {
          success: false,
          message: `实例 ${instanceName} 不存在`,
        };
      }
      // 更新实例配置
      instances[instanceIndex] = {
        ...instances[instanceIndex],
        ...updatedInstanceConfig,
      };

      // 保存实例配置
      const instancesConfigPath = path.join(
        this.instancesPath,
        "instances.json",
      );
      await tools.writeJsonFile(instancesConfigPath, instances);

      logger.instance.info(`编辑实例: ${instanceName}`);
      return { success: true, message: `实例 ${instanceName} 编辑成功` };
    } catch (error) {
      errorHandler.handleInstanceError(error);
    }
  }

  // 删除实例
  async deleteInstance(instanceName) {
    try {
      // 检查实例是否在运行
      if (this.instances.has(instanceName)) {
        await this.stopInstance(instanceName);
      }

      // 获取现有实例
      const instances = await this.getInstances();
      const filteredInstances = instances.filter(
        (i) => i.name !== instanceName,
      );

      // 保存实例配置
      const instancesConfigPath = path.join(
        this.instancesPath,
        "instances.json",
      );
      await tools.writeJsonFile(instancesConfigPath, filteredInstances);

      logger.instance.info(`删除实例: ${instanceName}`);
      return { success: true, message: `实例 ${instanceName} 删除成功` };
    } catch (error) {
      errorHandler.handleInstanceError(error);
    }
  }
}

export default new InstanceManager();
