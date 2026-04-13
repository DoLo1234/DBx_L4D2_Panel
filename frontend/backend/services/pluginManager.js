import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// 导入共享模块
import config from "../config/index.js";
import logger from "../utils/logger.js";
import tools from "../utils/tools.js";
import errorHandler from "../utils/errorHandler.js";

class PluginManager {
  constructor() {
    this.serverPath = config.serverPath;
    this.availablePluginsPath = config.availablePluginsPath;
    this.installedReceiptsPath = config.installedReceiptsPath;
    // 确保可用插件目录存在
    tools.ensureDirectoryExists(this.availablePluginsPath);
  }

  // 获取可用插件列表
  async getAvailablePlugins() {
    try {
      const plugins = [];

      // 读取可用插件目录
      if (fs.existsSync(this.availablePluginsPath)) {
        const pluginDirs = fs.readdirSync(this.availablePluginsPath);
        pluginDirs.forEach((dir) => {
          const pluginPath = path.join(this.availablePluginsPath, dir);
          if (fs.statSync(pluginPath).isDirectory()) {
            plugins.push({
              name: dir,
              path: pluginPath,
            });
          }
        });
      }

      return plugins;
    } catch (error) {
      errorHandler.handlePluginError(error);
      return [];
    }
  }

  // 获取已安装插件列表
  async getInstalledPlugins(serverName) {
    try {
      const pluginsList = await this.readPluginReceipts(serverName);
      return pluginsList;
    } catch (error) {
      logger.plugin.error(`获取已安装插件错误: ${error.message}`);
      return [];
    }
  }

  // 安装插件
  async installPlugin(pluginName, serverName) {
    try {
      console.log("安装插件", pluginName, serverName);

      // 检查插件是否存在
      const availablePlugins = await this.getAvailablePlugins();
      const plugin = availablePlugins.find((p) => p.name === pluginName);
      console.log("插件", plugin);
      if (!plugin) {
        throw new Error(`插件 ${pluginName} 未找到`);
      }

      // 确定服务器目录
      let targetServerPath = path.join(this.serverPath, serverName);

      // 检查服务器目录是否存在
      if (!fs.existsSync(targetServerPath)) {
        throw new Error(`服务器 ${serverName} 未找到`);
      }

      logger.plugin.info(`正在安装插件 ${pluginName} 到服务器 ${serverName}`);

      // 复制插件文件到服务器目录
      const pluginPath = plugin.path;
      const pluginFiles = await this.getPluginFiles(pluginPath);
      // console.log("插件文件", pluginFiles);

      // 先确认插件文件在服务器里对应目录是否已经存在
      const checkResult = await this.checkPluginFilesExist(
        pluginFiles,
        targetServerPath,
        pluginPath,
        serverName,
      );
      if (checkResult.exists) {
        // 提取所有冲突的插件名称（去重）
        const conflictingPlugins = [
          ...new Set(
            checkResult.files.map((f) => f.conflictingPlugin).filter(Boolean),
          ),
        ];

        // 提取所有冲突的文件路径
        const conflictingFiles = checkResult.files
          .map((f) => f.relative)
          .join(", ");

        let message = `插件 ${pluginName} 无法安装到服务器 ${serverName}。 `;

        // 先显示与哪些插件冲突
        if (conflictingPlugins.length > 0) {
          message += `与以下插件冲突: ${conflictingPlugins.join(", ")}。 `;
        }

        // 然后列出冲突的文件路径
        message += `冲突文件: ${conflictingFiles}`;

        return {
          success: false,
          message: message,
        };
      }

      for (const file of pluginFiles) {
        const relativePath = path.relative(pluginPath, file);
        const targetPath = path.join(targetServerPath, relativePath);
        // 复制文件（tools.copyFile会自动确保目标目录存在）
        await tools.copyFile(file, targetPath);
      }

      // 创建或更新插件记录文件
      const receiptPath = await this.getReceiptPath(serverName);

      // 读取现有记录
      let pluginsList = await this.readPluginReceipts(serverName);
      const options = { timeZone: "Asia/Shanghai", hour12: false };
      // 创建安装回执
      const receipt = {
        name: pluginName,
        installedAt: new Date().toLocaleString("zh-CN", options),
        files: pluginFiles.map((file) => path.relative(pluginPath, file)),
      };
      // 添加新记录
      pluginsList.push(receipt);

      // 写入更新后的记录
      await tools.writeJsonFile(receiptPath, pluginsList);

      logger.plugin.info(`插件 ${pluginName} 成功安装到服务器 ${serverName}`);
      return {
        success: true,
        message: `插件 ${pluginName} 成功安装到服务器 ${serverName}`,
      };
    } catch (error) {
      logger.plugin.error(`安装插件错误: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // 卸载插件
  async uninstallPlugin(pluginName, serverName) {
    try {
      // 读取现有记录
      let pluginsList = await this.readPluginReceipts(serverName);

      if (pluginsList.length === 0) {
        throw new Error(
          `插件 ${pluginName} 未安装在服务器 ${serverName || "default"}`,
        );
      }

      // 查找插件记录
      const existingIndex = pluginsList.findIndex((p) => p.name === pluginName);
      if (existingIndex < 0) {
        throw new Error(
          `插件 ${pluginName} 未安装在服务器 ${serverName || "default"}`,
        );
      }

      const receipt = pluginsList[existingIndex];

      logger.plugin.info(
        `正在从服务器 ${serverName || "default"} 卸载插件 ${pluginName}`,
      );

      // 确定服务器目录
      let targetServerPath = path.join(this.serverPath, serverName);

      // 删除插件文件
      for (const relativePath of receipt.files) {
        const targetPath = path.join(targetServerPath, relativePath);
        if (fs.existsSync(targetPath)) {
          await tools.deleteRecursive(targetPath);
        }
      }

      // 从记录中移除插件
      pluginsList.splice(existingIndex, 1);

      // 构建收据文件路径
      const receiptPath = await this.getReceiptPath(serverName);

      // 写入更新后的记录
      await tools.writeJsonFile(receiptPath, pluginsList);

      logger.plugin.info(
        `插件 ${pluginName} 成功从服务器 ${serverName || "default"} 卸载`,
      );
      return {
        success: true,
        message: `插件 ${pluginName} 成功从服务器 ${serverName || "default"} 卸载`,
      };
    } catch (error) {
      logger.plugin.error(`卸载插件错误: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // 获取插件文件列表
  async getPluginFiles(pluginPath) {
    return await tools.getAllFiles(pluginPath);
  }

  // 检查插件文件是否已经存在
  async checkPluginFilesExist(
    pluginFiles,
    targetServerPath,
    pluginRootPath,
    serverName,
  ) {
    try {
      const existingFiles = [];
      // 遍历插件文件列表
      for (const file of pluginFiles) {
        // 计算文件相对于插件根目录的路径
        const relativePath = path.relative(pluginRootPath, file);
        console.log("相对路径:", relativePath);
        // 构建目标文件路径
        const targetFilePath = path.join(targetServerPath, relativePath);
        console.log("目标文件路径:", targetFilePath);
        // 检查目标文件是否存在
        if (fs.existsSync(targetFilePath)) {
          logger.plugin.warn(`插件文件 ${file} 已存在`);
          // 查找冲突的插件
          const conflictingPlugin = await this.findConflictingPlugin(
            relativePath,
            serverName,
          );
          existingFiles.push({
            source: file,
            target: targetFilePath,
            relative: relativePath,
            conflictingPlugin: conflictingPlugin,
          });
        }
      }
      // 返回存在的文件列表和是否存在的标志
      return {
        exists: existingFiles.length > 0,
        files: existingFiles,
      };
    } catch (error) {
      logger.plugin.error(`检查插件文件存在性错误: ${error.message}`);
      // 出错时默认返回空数组，允许继续安装
      return {
        exists: false,
        files: [],
      };
    }
  }

  // 获取插件收据文件路径
  async getReceiptPath(serverName) {
    const serverReceiptsPath = path.join(
      this.installedReceiptsPath,
      serverName,
    );
    await tools.ensureDirectoryExists(serverReceiptsPath);
    return path.join(serverReceiptsPath, "plugins.json");
  }

  // 读取插件记录文件
  async readPluginReceipts(serverName) {
    try {
      // 确保插件记录目录存在
      const receiptPath = await this.getReceiptPath(serverName);
      if (!fs.existsSync(receiptPath)) {
        return [];
      }

      const existingData = fs.readFileSync(receiptPath, "utf8");
      const pluginsList = JSON.parse(existingData);
      return pluginsList;
    } catch (error) {
      logger.plugin.error(`读取插件记录文件错误: ${error.message}`);
      return [];
    }
  }

  // 查找与指定文件冲突的插件
  async findConflictingPlugin(relativePath, serverName) {
    try {
      const pluginsList = await this.readPluginReceipts(serverName);

      // 查找包含冲突文件的插件
      for (const plugin of pluginsList) {
        if (plugin.files && plugin.files.includes(relativePath)) {
          return `插件 ${plugin.name} 已存在，无法安装`;
        }
      }
      return null;
    } catch (error) {
      logger.plugin.error(`查找冲突插件错误: ${error.message}`);
      return null;
    }
  }

  // 查找最新的安装包
  findLatestInstaller(installersPath, prefix) {
    if (!fs.existsSync(installersPath)) {
      return null;
    }

    const installers = fs.readdirSync(installersPath);
    const filteredInstallers = installers.filter(
      (file) => file.startsWith(prefix) && file.endsWith(".tar.gz"),
    );

    if (filteredInstallers.length === 0) {
      return null;
    }

    // 按版本号排序，返回最新的
    filteredInstallers.sort((a, b) => {
      return b.localeCompare(a);
    });

    return path.join(installersPath, filteredInstallers[0]);
  }

  // 获取已安装插件数量
  async getInstalledPluginsCount(serverName) {
    try {
      const plugins = await this.getInstalledPlugins(serverName);
      return plugins.length;
    } catch (error) {
      logger.plugin.error(`获取已安装插件数量错误: ${error.message}`);
      return 0;
    }
  }

  // 获取插件总数
  async getTotalPluginsCount() {
    try {
      const plugins = await this.getAvailablePlugins();
      return plugins.length;
    } catch (error) {
      logger.plugin.error(`获取插件总数错误: ${error.message}`);
      return 0;
    }
  }

  // 获取插件概览数据
  async getPluginsOverview() {
    try {
      const totalPluginsCount = await this.getTotalPluginsCount();
      const pluginDirectorySize = await tools.calculateDirectorySize(
        this.availablePluginsPath,
      );

      return {
        totalPluginsCount,
        pluginDirectorySize: tools.formatSize(pluginDirectorySize),
      };
    } catch (error) {
      logger.plugin.error(`获取插件概览数据错误: ${error.message}`);
      return {
        totalPluginsCount: 0,
        pluginDirectorySize: "0B",
      };
    }
  }
}

export default new PluginManager();
