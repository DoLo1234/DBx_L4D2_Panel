/**
 * 地图管理服务模块
 * 处理地图的上传、删除、分配、解压等相关业务逻辑
 */
import fs from "fs";
import path from "path";
import config from "../config/index.js";
import logger from "../utils/logger.js";
import tools from "../utils/tools.js";
import fileManager from "./fileManager.js";
import errorHandler from "../utils/errorHandler.js";
/**
 * 地图管理服务类
 */
class MapManager {
  /**
   * 构造函数
   */
  constructor() {
    // 地图目录路径
    this.mapsPath = config.mapsPath;
    this.assignMapData = config.assignMapData;
    // 确保地图目录存在
    this.ensureMapsDirectory();

    this.fsPromises = fs.promises;
  }

  /**
   * 生成地图文件树
   * @param {string} requestedPath - 目录路径（可选）
   * @returns {Array} 文件树结构
   */
  generateMapTree(requestedPath) {
    // 确定根目录
    const rootDir = requestedPath || this.mapsPath;
    return fileManager.generateFileTree(rootDir);
  }

  /**
   * 确保地图目录存在
   */
  async ensureMapsDirectory() {
    if (!fs.existsSync(this.mapsPath)) {
      logger.map.info(`正在创建地图目录: ${this.mapsPath}`);
      await tools.ensureDirectoryExists(this.mapsPath);
      logger.map.info(`地图目录创建成功: ${this.mapsPath}`);
    }
  }

  /**
   * 删除地图
   * @param {string} mapName - 地图名称
   */
  async deleteMap(mapName) {
    if (!mapName) {
      throw new Error("地图名称不能为空");
    }

    const mapPath = path.join(this.mapsPath, mapName);
    logger.map.info(`正在删除地图: ${mapName}`);
    try {
      await fileManager.deleteFile(mapPath);
      logger.map.info(`地图删除成功: ${mapName}`);
    } catch (error) {
      logger.map.error(`删除地图失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 分配地图到服务器
   * @param {string} mapName - 地图名称
   * @param {string} serverName - 服务器名称
   * @returns {Object} 分配结果
   */
  async assignMapToServer(mapName, serverName) {
    if (!mapName || !serverName) {
      throw new Error("地图名称和服务器名称不能为空");
    }

    const mapPath = path.join(this.mapsPath, mapName);
    const serverPath = path.join(config.serverPath, serverName);

    if (!fs.existsSync(mapPath)) {
      throw new Error("地图不存在");
    }

    if (!fs.existsSync(serverPath)) {
      throw new Error("服务器目录不存在");
    }

    logger.map.info(`正在将地图 ${mapName} 分配到服务器 ${serverName}`);

    try {
      // 获取服务器分配地图数据
      const assignMapData = await this.getServerAssignMapData();
      // 检查地图是否已分配
      if (
        assignMapData.some(
          (item) => item.mapName === mapName && item.serverName === serverName,
        )
      ) {
        throw new Error(`地图 ${mapName} 已分配到服务器 ${serverName}`);
      }

      const isWindows = process.platform === "win32";

      // 服务器地图目录
      const mapsDir = path.join(serverPath, "left4dead2", "addons");
      if (!fs.existsSync(mapsDir)) {
        fs.mkdirSync(mapsDir, { recursive: true });
      }

      const targetLinkPath = path.join(mapsDir, mapName);

      // 处理已存在的链接
      if (fs.existsSync(targetLinkPath)) {
        const stats = fs.lstatSync(targetLinkPath);
        if (stats.isSymbolicLink()) {
          fs.unlinkSync(targetLinkPath);
        } else {
          throw new Error("目标路径已存在且不是符号链接");
        }
      }

      if (isWindows) {
        // Windows 系统处理
        // 单个文件处理
        const fileName = path.basename(mapPath);
        const targetFile = path.join(mapsDir, fileName);

        // 删除已存在的文件
        if (fs.existsSync(targetFile)) {
          fs.unlinkSync(targetFile);
        }
      }
      // 创建符号链接
      await this.assignMapLinkToPath(mapPath, targetLinkPath, "file");

      // 写入分配地图数据
      const assignMapDataConfigPath = path.join(
        this.assignMapData,
        "assignMapData.json",
      );
      await tools.writeJsonFile(assignMapDataConfigPath, [
        ...assignMapData,
        { mapName, serverName, mapPath, targetLinkPath },
      ]);

      logger.map.info(`地图 ${mapName} 成功分配到服务器 ${serverName}`);

      return `地图 ${mapName} 已分配到服务器 ${serverName}`;
    } catch (error) {
      logger.map.error(`分配地图到服务器失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 分配地图到指定路径
   * @param {string} sourcePath - 源文件路径
   * @param {string} linkPath - 链接路径
   * @param {string} type - 链接类型（"file" 或 "dir"）
   * @returns {Promise<void>} 异步操作
   */
  async assignMapLinkToPath(sourcePath, linkPath, type) {
    try {
      await this.fsPromises.symlink(sourcePath, linkPath, type);
    } catch (err) {
      throw new Error(
        `创建软链接失败：${err.message},请检查权限(windows需要管理员权限)`,
      );
    }
  }

  /**
   * 获取地图文件列表
   * @param {string} mapPath - 地图路径（可以是文件或目录）
   * @returns {Array} 文件路径数组
   */
  async getMapFiles(mapPath) {
    const files = [];

    // 检查 mapPath 是否存在
    if (!(await tools.fileExists(mapPath))) {
      return files;
    }

    // 检查 mapPath 是文件还是目录
    const stats = await tools.statFile(mapPath);

    if (stats.isFile()) {
      // 如果是文件，直接返回该文件
      const fileName = path.basename(mapPath);
      files.push(fileName);
    } else if (stats.isDirectory()) {
      /**
       * 扫描目录获取文件
       * @param {string} dir - 目录路径
       */
      const scanDirectory = (dir) => {
        const entries = fs.readdirSync(dir);
        entries.forEach((entry) => {
          const entryPath = path.join(dir, entry);
          const entryStats = fs.statSync(entryPath);

          if (entryStats.isDirectory()) {
            scanDirectory(entryPath);
          } else {
            const relativePath = path.relative(mapPath, entryPath);
            files.push(relativePath);
          }
        });
      };

      scanDirectory(mapPath);
    }

    return files;
  }

  /**
   * 获取服务器分配地图数据
   * @returns {Promise<Array>} 分配地图数据数组
   */
  async getServerAssignMapData() {
    try {
      // 读取实例配置文件
      const assignMapDataConfigPath = path.join(
        this.assignMapData,
        "assignMapData.json",
      );

      // 确保实例配置文件存在
      if (!(await tools.fileExists(assignMapDataConfigPath))) {
        // 如果文件不存在，创建一个空数组文件
        await tools.writeJsonFile(assignMapDataConfigPath, []);
        return [];
      }
      // 直接返回实例配置，不添加默认值
      return await tools.readJsonFile(assignMapDataConfigPath);
    } catch (error) {
      errorHandler.handleAssignMapDataError(error);
      return [];
    }
  }

  /**
   * 从服务器移除地图
   * @param {string} mapName - 地图名称
   * @param {string} serverName - 服务器名称
   * @returns {Object} 移除结果
   */
  async removeMapFromServer(mapName, serverName) {
    if (!mapName || !serverName) {
      throw new Error("地图名称和服务器名称不能为空");
    }

    const serverPath = path.join(config.serverPath, serverName);

    if (!fs.existsSync(serverPath)) {
      throw new Error("服务器目录不存在");
    }

    const mapsDir = path.join(serverPath, "left4dead2", "addons");

    if (!fs.existsSync(mapsDir)) {
      return {
        success: true,
        message: "服务器 addons 目录不存在，无需删除",
      };
    }

    logger.map.info(`正在从服务器 ${serverName} 移除地图 ${mapName}`);

    try {
      const assignMapData = await this.getServerAssignMapData();
      // 检查地图是否已分配
      if (
        !assignMapData.some(
          (item) => item.mapName === mapName && item.serverName === serverName,
        )
      ) {
        throw new Error(`地图 ${mapName} 未分配到服务器 ${serverName}`);
      }

      const targetLinkPath = path.join(mapsDir, mapName);

      // 处理符号链接
      if (fs.existsSync(targetLinkPath)) {
        const stats = fs.lstatSync(targetLinkPath);

        if (stats.isSymbolicLink()) {
          fs.unlinkSync(targetLinkPath);
        } else if (stats.isFile()) {
          fs.unlinkSync(targetLinkPath);
        }
      }

      // 清理相关文件
      const mapFiles = this.getMapFilesFromServer(mapsDir, mapName);
      for (const file of mapFiles) {
        const filePath = path.join(mapsDir, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      console.log("已分配的文件", assignMapData);

      // 从分配地图数据中移除
      const updatedAssignMapData = assignMapData.filter(
        (item) => !(item.mapName === mapName && item.serverName === serverName),
      );
      console.log("updatedAssignMapData", updatedAssignMapData);
      // 写入分配地图数据
      const assignMapDataConfigPath = path.join(
        this.assignMapData,
        "assignMapData.json",
      );
      await tools.writeJsonFile(assignMapDataConfigPath, updatedAssignMapData);

      logger.map.info(`地图 ${mapName} 成功从服务器 ${serverName} 移除`);

      return `地图 ${mapName} 已从服务器 ${serverName} 移除`;
    } catch (error) {
      logger.map.error(`从服务器移除地图失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 从服务器获取地图相关文件
   * @param {string} mapsDir - 服务器地图目录
   * @param {string} mapName - 地图名称
   * @returns {Array} 文件列表
   */
  getMapFilesFromServer(mapsDir, mapName) {
    const files = [];

    if (!fs.existsSync(mapsDir)) {
      return files;
    }

    const entries = fs.readdirSync(mapsDir);
    entries.forEach((entry) => {
      if (entry.startsWith(mapName)) {
        files.push(entry);
      }
    });

    return files;
  }

  /**
   * 解压地图压缩包
   * @param {string} zipFilePath - 压缩包路径
   * @param {string} targetDir - 目标目录（可选）
   * @param {boolean} deleteSource - 是否删除源文件（可选）
   * @returns {Object} 解压结果
   */
  async unzipMap(zipFilePath, targetDir, deleteSource = false) {
    if (!zipFilePath) {
      throw new Error("压缩包路径不能为空");
    }

    if (!fs.existsSync(zipFilePath)) {
      throw new Error("压缩包文件不存在");
    }

    const targetPath = targetDir || this.mapsPath;

    if (!fs.existsSync(targetPath)) {
      await tools.ensureDirectoryExists(targetPath);
    }

    logger.map.info(`正在解压地图压缩包: ${zipFilePath} 到 ${targetPath}`);

    try {
      // 使用工具方法解压
      const result = await tools.extractFile(
        zipFilePath,
        targetPath,
        true,
        deleteSource,
      );

      logger.map.info(`地图压缩包解压成功: ${zipFilePath}`);

      return result;
    } catch (error) {
      logger.map.error(`解压地图压缩包失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取地图统计数据
   * @param {string} serverName - 服务器名称
   * @returns {Object} 地图统计数据
   */
  async getMapsOverview(serverName) {
    if (!serverName) {
      throw new Error("服务器名称不能为空");
    }

    try {
      // 获取已分配地图数据
      const assignMapData = await this.getServerAssignMapData();
      const assignedMapNames = assignMapData.map((item) => item.mapName);

      // 获取所有地图文件
      const allMaps = await this.getAllMaps();
      const allMapNames = allMaps.map((item) => item.name);

      // 计算未分配地图
      const unassignedMapNames = allMapNames.filter(
        (name) => !assignedMapNames.includes(name),
      );
      // 计算地图目录大小
      const totalSize = await tools.calculateDirectorySize(this.mapsPath);
      const formattedSize = tools.formatSize(totalSize);

      return {
        totalMapsCount: allMapNames.length,
        assignedMapsCount: assignedMapNames.length,
        unassignedMapsCount: unassignedMapNames.length,
        mapDirectorySize: formattedSize,
        assignMapData,
      };
    } catch (error) {
      logger.map.error(`获取地图统计数据失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取所有地图文件
   * @returns {Array} 地图文件列表
   */
  async getAllMaps() {
    const maps = [];

    await tools.traverseDirectory(
      this.mapsPath,
      async (entryPath, entry, stats) => {
        // 只考虑 .vpk 文件
        if (entry.endsWith(".vpk")) {
          maps.push({
            name: entry,
            path: entryPath,
            size: stats.size,
          });
        }
      },
    );

    return maps;
  }
}

// 导出地图管理服务实例
export default new MapManager();
