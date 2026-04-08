import fs from "fs";
import path from "path";
import os from "os";
import net from "net";
// import _7z from "7zip-min";
import archive from "./archiveManager.js";

// 工具函数模块
class Tools {
  /**
   * 检查文件是否存在
   * @param {string} path 文件路径
   * @returns {Promise<boolean>} 文件是否存在
   */
  static async fileExists(path) {
    try {
      await fs.promises.access(path, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取文件信息
   * @param {string} path 文件路径
   * @returns {Promise<fs.Stats | null>} 文件信息
   */
  static async statFile(path) {
    try {
      return await fs.promises.stat(path);
    } catch (error) {
      return null;
    }
  }

  /**
   * 设置文件权限
   * @param {string} filePath 文件路径
   * @param {number} mode 权限模式
   * @returns {Promise<boolean>} 是否成功设置权限
   */
  static async chmodFile(filePath, mode) {
    try {
      await fs.promises.chmod(filePath, mode);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 确保目录存在
   * @param {string} directoryPath 目录路径
   * @returns {Promise<boolean>} 目录是否存在
   */
  static async ensureDirectoryExists(directoryPath) {
    try {
      await fs.promises.access(directoryPath);
      return false;
    } catch (error) {
      await fs.promises.mkdir(directoryPath, { recursive: true });
      return true;
    }
  }

  /**
   * 读取JSON文件
   * @param {string} filePath 文件路径
   * @param {object} defaultValue 默认值
   * @returns {Promise<object>} JSON对象
   */
  static async readJsonFile(filePath, defaultValue = {}) {
    try {
      const data = await fs.promises.readFile(filePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error(`读取JSON文件失败 ${filePath}: ${error.message}`);
      return defaultValue;
    }
  }

  /**
   * 写入JSON文件
   * @param {string} filePath 文件路径
   * @param {object} data JSON对象
   * @param {number} indent JSON缩进级别
   * @returns {Promise<boolean>} 是否成功写入
   */
  static async writeJsonFile(filePath, data, indent = 2) {
    try {
      // 确保目录存在
      const directoryPath = path.dirname(filePath);
      await this.ensureDirectoryExists(directoryPath);

      await fs.promises.writeFile(filePath, JSON.stringify(data, null, indent));
      return true;
    } catch (error) {
      console.error(`写入JSON文件失败 ${filePath}: ${error.message}`);
      return false;
    }
  }

  /**
   * 读取文件内容
   * @param {string} filePath 文件路径
   * @param {string} encoding 编码方式
   * @returns {Promise<string>} 文件内容
   */
  static async readFile(filePath, encoding = "utf8") {
    try {
      return await fs.promises.readFile(filePath, encoding);
    } catch (error) {
      console.error(`读取文件失败 ${filePath}: ${error.message}`);
      return error;
    }
  }

  /**
   * 写入文件内容
   * @param {string} filePath 文件路径
   * @param {string} content 文件内容
   * @param {string} encoding 编码方式
   * @returns {Promise<boolean>} 是否成功写入
   */
  static async writeFile(filePath, content, encoding = "utf8") {
    try {
      // 确保目录存在
      const directoryPath = path.dirname(filePath);
      await this.ensureDirectoryExists(directoryPath);

      await fs.promises.writeFile(filePath, content, encoding);
      return true;
    } catch (error) {
      console.error(`写入文件失败 ${filePath}: ${error.message}`);
      return error;
    }
  }

  /**
   * 获取目录下的所有文件
   * @param {string} directoryPath 目录路径
   * @param {string[]} extensions 文件扩展名
   * @returns {Promise<string[]>} 文件列表
   */
  static async getAllFiles(directoryPath, extensions = null) {
    const files = [];

    const walk = async (dir) => {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await walk(fullPath);
          } else {
            if (
              !extensions ||
              extensions.some((ext) => entry.name.endsWith(ext))
            ) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.error(`读取目录失败 ${dir}: ${error.message}`);
      }
    };

    try {
      await fs.promises.access(directoryPath);
      await walk(directoryPath);
    } catch (error) {
      // 目录不存在，返回空数组
    }

    return files;
  }

  /**
   * 遍历目录
   * @param {string} dir - 目录路径
   * @param {Function} fileCallback - 文件回调函数
   * @param {Function} dirCallback - 目录回调函数（可选）
   * @param {boolean} recursive - 是否递归遍历子目录，默认false
   */
  static async traverseDirectory(
    dir,
    fileCallback,
    dirCallback,
    recursive = false,
  ) {
    if (!(await this.fileExists(dir))) {
      return;
    }

    const entries = await fs.promises.readdir(dir);
    for (const entry of entries) {
      const entryPath = path.join(dir, entry);
      const stats = await fs.promises.stat(entryPath);

      if (stats.isDirectory()) {
        if (dirCallback) {
          // 等待异步目录回调执行完成
          await dirCallback(entryPath, entry);
        }
        // 只有在recursive为true时才递归遍历子目录
        if (recursive) {
          await this.traverseDirectory(
            entryPath,
            fileCallback,
            dirCallback,
            recursive,
          );
        }
      } else {
        if (fileCallback) {
          await fileCallback(entryPath, entry, stats);
        }
      }
    }
  }

  // 获取本地IP地址
  static getLocalIP() {
    const interfaces = os.networkInterfaces();

    for (const interfaceName in interfaces) {
      const iface = interfaces[interfaceName];
      for (const alias of iface) {
        if (alias.family === "IPv4" && !alias.internal) {
          return alias.address;
        }
      }
    }
    return "127.0.0.1";
  }

  /**
   * 检查端口是否已被占用
   * @param {number} port 端口号
   * @returns {Promise<boolean>} 是否已被占用
   */
  static async isPortOccupied(port) {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.on("error", () => {
        console.log(`Port ${port} is occupied: true`);
        resolve(true); // 端口被占用
      });

      server.on("listening", () => {
        server.close();
        console.log(`Port ${port} is occupied: false`);
        resolve(false); // 端口未被占用
      });

      server.listen(port, "localhost");
    });
  }

  /**
   * 格式化时间
   * @param {Date} date 时间对象
   * @returns {string} 格式化后的时间字符串
   */
  static formatTime(date = new Date()) {
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的大小
   */
  static formatSize(bytes) {
    if (bytes === 0) return "0B";

    const k = 1024;
    const sizes = ["B", "K", "M", "G", "T"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(0)) + sizes[i];
  }

  /**
   * 生成随机字符串
   * @param {number} length 字符串长度
   * @returns {string} 生成的随机字符串
   */
  static generateRandomString(length = 10) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 复制文件
   * @param {string} sourcePath 源文件路径
   * @param {string} targetPath 目标文件路径
   * @returns {Promise<boolean>} 是否成功复制
   */
  static async copyFile(sourcePath, targetPath) {
    try {
      // 确保目标目录存在
      const targetDir = path.dirname(targetPath);
      await this.ensureDirectoryExists(targetDir);

      await fs.promises.copyFile(sourcePath, targetPath);
      return true;
    } catch (error) {
      console.error(
        `复制文件失败 ${sourcePath} 到 ${targetPath}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * 计算目录大小
   * @param {string} dir - 目录路径
   * @returns {number} 目录大小（字节）
   */
  static async calculateDirectorySize(dir) {
    const calculateSize = async (directory, visitedDirs = new Set()) => {
      let totalSize = 0;

      // 检查是否已经访问过这个目录（防止循环引用）
      const dirPath = path.resolve(directory);
      if (visitedDirs.has(dirPath)) {
        return 0;
      }

      // 添加当前目录到已访问集合
      visitedDirs.add(dirPath);

      try {
        const entries = await fs.promises.readdir(directory);

        for (const entry of entries) {
          const entryPath = path.join(directory, entry);

          try {
            const stats = await fs.promises.stat(entryPath);

            if (stats.isDirectory()) {
              // 递归计算子目录大小
              const childVisitedDirs = new Set(visitedDirs);
              totalSize += await calculateSize(entryPath, childVisitedDirs);
            } else {
              // 累加文件大小
              totalSize += stats.size;
            }
          } catch (error) {
            // 忽略无法访问的文件/目录
            console.warn(`无法访问 ${entryPath}: ${error.message}`);
          }
        }
      } catch (error) {
        console.warn(`无法读取目录 ${directory}: ${error.message}`);
      }

      return totalSize;
    };

    return await calculateSize(dir);
  }

  /**
   * 解压文件
   * @param {string} sourcePath 源文件路径
   * @param {string} targetPath 目标目录路径
   * @param {boolean} isFlat - 是否扁平化解压（默认false）
   * @param {boolean} deleteSource - 是否删除源文件（默认false）
   * @returns {Promise<boolean>} 是否成功解压
   */
  static async extractFile(
    sourcePath,
    targetPath,
    isFlat = false,
    deleteSource = false,
  ) {
    try {
      // 确保目标目录存在
      await this.ensureDirectoryExists(targetPath);

      const result = await archive.extractArchive(
        sourcePath,
        targetPath,
        isFlat,
      );
      if (!result) {
        throw new Error(`解压文件失败 ${sourcePath} 到 ${targetPath}`);
      }

      // 如果删除源文件，尝试删除
      if (deleteSource) {
        const deleteSuccess = await this.deleteRecursive(sourcePath);
        if (!deleteSuccess) {
          console.warn(`删除源文件失败 ${sourcePath}`);
        }
      }

      // 如果是扁平化解压，删除空文件夹
      if (isFlat) {
        const emptyDirs = [];

        // 使用traverseDirectory遍历目录，收集空文件夹
        this.traverseDirectory(targetPath, null, async (dirPath) => {
          const entries = await fs.promises.readdir(dirPath);
          if (entries.length === 0) {
            emptyDirs.push(dirPath);
          }
        });

        // 删除收集到的空文件夹
        for (const dirPath of emptyDirs) {
          try {
            await this.deleteRecursive(dirPath);
            console.log(`删除空文件夹: ${dirPath}`);
          } catch (error) {
            console.warn(`删除空文件夹失败 ${dirPath}: ${error.message}`);
          }
        }
      }
      return true;
    } catch (error) {
      console.error(`解压文件失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 递归删除文件或文件夹
   * @param {string} targetPath - 目标路径
   * @returns {Promise<void>}
   */
  static async deleteRecursive(targetPath) {
    if (!(await this.fileExists(targetPath))) {
      return;
    }

    const stats = await fs.promises.stat(targetPath);
    if (stats.isDirectory()) {
      // 删除目录
      const files = await fs.promises.readdir(targetPath);
      for (const file of files) {
        const curPath = path.join(targetPath, file);
        await this.deleteRecursive(curPath);
      }
      await fs.promises.rmdir(targetPath);
    } else {
      // 删除文件
      await fs.promises.unlink(targetPath);
    }
  }
}

export default Tools;
