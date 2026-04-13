import fs from "fs";
import path from "path";
import https from "https";
import pty from "node-pty";
import { execSync } from "child_process";

// 导入共享模块
import config from "../config/index.js";
import logger from "../utils/logger.js";
import tools from "../utils/tools.js";
import errorHandler from "../utils/errorHandler.js";

class SteamCMDService {
  constructor() {
    // 使用配置模块中的配置
    this.steamcmdPath = config.steamcmdPath;
    this.serverPath = config.serverPath;
    this.steamcmdExe = config.steamcmdExe;
    this.steamcmdLinux32 = config.steamcmdLinux32;

    // SteamCMD目录存在（如果配置了的话）
    tools.ensureDirectoryExists(this.steamcmdPath);
    // 服务器目录存在（如果配置了的话）
    tools.ensureDirectoryExists(this.serverPath);
  }

  // 辅助方法：添加部署日志
  addDeployLog(message, isError = false, isWarning = false) {
    if (!global.deployStatus) return;

    // 格式化日志消息
    const logPrefix = isError ? "[错误]" : isWarning ? "[警告]" : "";
    const formattedMessage = `[${tools.formatTime()}] ${logPrefix} ${message}`;

    // 添加到部署日志
    global.deployStatus.logs.push(formattedMessage);
    // 最优先：通过WebSocket发送实时日志到前端
    if (global.websocketService) {
      global.websocketService.sendDeployLog(`${logPrefix} ${message}\n`);
    }

    // 触发实时日志事件（兼容旧的process.send方式）
    if (process.send) {
      process.send({ type: "steamcmd_log", data: `${logPrefix} ${message}\n` });
    }

    // 最后：每10条日志保存一次到文件（避免频繁I/O）
    // if (global.saveDeployStatus && global.deployStatus.logs.length % 10 === 0) {
    //   global.saveDeployStatus(global.deployStatus);
    // }
  }

  /**
   * 向运行中的 SteamCMD 进程发送命令（内部工具方法）
   * @param {string} cmd 要发送的 SteamCMD 命令
   * @returns {boolean} 是否发送成功
   */
  sendDeployCommand(cmd) {
    try {
      if (!global.deployStatus || !global.deployStatus.process) {
        this.addDeployLog("无运行中的部署进程，无法发送命令", true);
        return false;
      }
      const process = global.deployStatus.process;
      // 检查进程是否存活
      if (process.killed) {
        this.addDeployLog("部署进程已结束", true);
        return false;
      }
      // 发送命令（SteamCMD 要求换行结尾）
      process.write(cmd.trim() + "\n");
      return true;
    } catch (err) {
      this.addDeployLog(`发送命令失败:${err.message}`, true);
      return false;
    }
  }

  // 辅助方法：更新部署状态
  updateDeployStatus(status, deploying = false) {
    if (!global.deployStatus) return;

    // 更新部署状态
    global.deployStatus.status = status;
    global.deployStatus.deploying = deploying;

    // 通过WebSocket发送状态更新
    if (global.websocketService) {
      global.websocketService.sendDeployStatus({
        status: status,
        deploying: deploying,
      });
    }

    // 保存更新后的部署状态
    // if (global.saveDeployStatus) {
    //   global.saveDeployStatus(global.deployStatus);
    // }
  }

  // 检查SteamCMD是否存在且完整
  async checkSteamCMD() {
    try {
      const checkMessage = `正在检查SteamCMD路径: ${this.steamcmdPath}`;
      logger.steamcmd.info(checkMessage);
      this.addDeployLog(checkMessage);

      const steamcmdExePath = path.join(this.steamcmdPath, this.steamcmdExe);
      const exePathMessage = `正在查找SteamCMD可执行文件: ${steamcmdExePath}`;
      logger.steamcmd.info(exePathMessage);
      this.addDeployLog(exePathMessage);

      if (!(await tools.fileExists(this.steamcmdPath))) {
        const errorMessage = `未找到SteamCMD目录: ${this.steamcmdPath}`;
        logger.steamcmd.error(errorMessage);
        this.addDeployLog(errorMessage, true);
        return false;
      }

      if (!(await tools.fileExists(steamcmdExePath))) {
        const errorMessage = `未找到SteamCMD可执行文件: ${steamcmdExePath}`;
        logger.steamcmd.error(errorMessage);
        this.addDeployLog(errorMessage, true);
        return false;
      }

      // 检查SteamCMD的核心文件是否存在
      if (process.platform !== "win32") {
        const linux32Path = path.join(this.steamcmdPath, "linux32");
        // steamcmd.sh目录
        const steamcmdShPath = path.join(this.steamcmdPath, this.steamcmdExe);
        // steamcmd目录
        const steamcmdExePathLinux32 = path.join(
          linux32Path,
          this.steamcmdLinux32,
        );

        if (!(await tools.fileExists(steamcmdShPath))) {
          const errorMessage = `未找到SteamCMD文件: ${steamcmdShPath}`;
          logger.steamcmd.error(errorMessage);
          this.addDeployLog(errorMessage, true);
          return false;
        }

        if (!(await tools.fileExists(steamcmdExePathLinux32))) {
          const errorMessage = `未找到SteamCMD linux32可执行文件: ${steamcmdExePathLinux32}`;
          logger.steamcmd.error(errorMessage);
          this.addDeployLog(errorMessage, true);
          return false;
        }

        const binaryFoundMessage = `找到SteamCMD执行文件: ${steamcmdShPath}`;
        logger.steamcmd.info(binaryFoundMessage);
        this.addDeployLog(binaryFoundMessage);
      }

      const successMessage = "SteamCMD查找成功且完整";
      logger.steamcmd.info(successMessage);
      this.addDeployLog(successMessage);

      return true;
    } catch (error) {
      const errorMessage = `检查SteamCMD失败: ${error.message}`;
      logger.steamcmd.error(errorMessage);
      errorHandler.handleSteamCmdError(error);
      this.addDeployLog(errorMessage, true);
      return false;
    }
  }

  // 下载文件
  async downloadFile(url, tempFile) {
    logger.steamcmd.info(`正在从 ${url} 下载文件`);
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(tempFile);
      const request = https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`下载文件失败: ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on("finish", () => {
          file.close(() => {
            logger.steamcmd.info("文件下载成功");
            resolve();
          });
        });
      });

      request.on("error", (error) => {
        this.cleanupTempFile(tempFile);
        reject(new Error(`下载错误: ${error.message}`));
      });

      file.on("error", (error) => {
        this.cleanupTempFile(tempFile);
        reject(new Error(`文件写入错误: ${error.message}`));
      });
    });
  }

  // 清理临时文件
  async cleanupTempFile(tempFile) {
    if (await tools.deleteRecursive(tempFile)) {
      logger.steamcmd.info(`清理临时文件: ${tempFile}`);
    } else {
      logger.steamcmd.warn(`清理临时文件失败: ${tempFile}`);
    }
  }

  // 验证文件是否存在
  async validateFileExists(filePath, errorMessage) {
    if (!(await tools.fileExists(filePath))) {
      throw new Error(errorMessage);
    }
  }

  // 下载SteamCMD
  async downloadSteamCMD() {
    try {
      const startMessage = "开始下载SteamCMD";
      logger.steamcmd.info(startMessage);

      this.addDeployLog(startMessage);

      // 确保目录存在
      await tools.ensureDirectoryExists(this.steamcmdPath);

      const platform = process.platform;
      let downloadUrl, tempFile;

      if (platform === "win32") {
        // Windows平台
        downloadUrl = process.env.STEAMCMD_DOWNLOAD_URL_WINDOWS;
        tempFile = path.join(this.steamcmdPath, "steamcmd.zip");
        const steamcmdExePath = path.join(this.steamcmdPath, this.steamcmdExe);

        const downloadMessage = `正在从 ${downloadUrl} 下载SteamCMD`;
        logger.steamcmd.info(downloadMessage);

        this.addDeployLog(downloadMessage);

        // 下载SteamCMD
        await this.downloadFile(downloadUrl, tempFile);

        // 解压SteamCMD (Windows平台)
        const extractMessage = "正在解压SteamCMD";
        logger.steamcmd.info(extractMessage);

        this.addDeployLog(extractMessage);

        const extractPath = this.steamcmdPath;

        // 确保解压目录存在
        await tools.ensureDirectoryExists(extractPath);

        // 使用工具方法解压zip文件
        try {
          await tools.extractFile(tempFile, extractPath, false, true);

          const extractSuccessMessage = "使用7-Zip成功解压SteamCMD";
          logger.steamcmd.info(extractSuccessMessage);
          this.addDeployLog(extractSuccessMessage);
        } catch (error) {
          this.cleanupTempFile(tempFile);
          const extractErrorMessage = `解压SteamCMD失败: ${error.message}`;
          logger.steamcmd.error(extractErrorMessage);
          this.addDeployLog(extractErrorMessage, true);
          throw new Error(extractErrorMessage);
        }

        // 清理临时文件
        // this.cleanupTempFile(tempFile);

        // 验证解压是否成功
        this.validateFileExists(
          steamcmdExePath,
          "解压后未找到SteamCMD可执行文件",
        );
      } else {
        // Linux平台
        downloadUrl = process.env.STEAMCMD_DOWNLOAD_URL_LINUX;
        tempFile = path.join(this.steamcmdPath, "steamcmd_linux.tar.gz");
        const steamcmdExePath = path.join(this.steamcmdPath, this.steamcmdExe);
        const steamcmdExePathLinux32 = path.join(
          this.steamcmdPath,
          "linux32",
          this.steamcmdLinux32,
        );
        const downloadMessage = `正在从 ${downloadUrl} 下载SteamCMD`;
        logger.steamcmd.info(downloadMessage);

        this.addDeployLog(downloadMessage);

        // 下载SteamCMD
        await this.downloadFile(downloadUrl, tempFile);

        // 使用工具方法解压tar.gz文件
        const extractMessage = "正在解压SteamCMD";
        logger.steamcmd.info(extractMessage);

        this.addDeployLog(extractMessage);

        try {
          // 解压tar.gz文件 并删除源文件
          await tools.extractFile(tempFile, this.steamcmdPath, false, true);

          const extractSuccessMessage = "使用7-Zip成功解压SteamCMD";
          logger.steamcmd.info(extractSuccessMessage);
          this.addDeployLog(extractSuccessMessage);
        } catch (error) {
          this.cleanupTempFile(tempFile);
          const extractErrorMessage = `解压SteamCMD失败: ${error.message}`;
          logger.steamcmd.error(extractErrorMessage);
          this.addDeployLog(extractErrorMessage, true);
          throw new Error(extractErrorMessage);
        }

        // 清理临时文件
        // this.cleanupTempFile(tempFile);

        // 验证解压是否成功
        this.validateFileExists(
          steamcmdExePath,
          "解压后未找到SteamCMD.sh可执行文件",
        );

        // 验证解压是否成功
        this.validateFileExists(
          steamcmdExePathLinux32,
          "解压后未找到SteamCMD可执行文件",
        );

        // 设置执行权限
        try {
          // 设置steamcmd.sh执行权限
          // 0o755 表示可读可写可执行，组可读可执行，其他可读可执行
          await tools.chmodFile(steamcmdExePath, 0o755);
          await tools.chmodFile(steamcmdExePathLinux32, 0o755);
          const chmodMessage = "为SteamCMD设置可执行权限";
          logger.steamcmd.info(chmodMessage);

          this.addDeployLog(chmodMessage);
        } catch (error) {
          const chmodErrorMessage = `设置可执行权限失败: ${error.message}`;
          logger.steamcmd.warn(chmodErrorMessage);

          this.addDeployLog(chmodErrorMessage, false, true);
        }
      }

      const successMessage = "SteamCMD安装成功完成";
      logger.steamcmd.info(successMessage);

      this.addDeployLog(successMessage);

      return true;
    } catch (error) {
      const errorMessage = `下载SteamCMD失败: ${error.message}`;
      logger.steamcmd.error(errorMessage);
      errorHandler.handleSteamCmdError(error);

      this.addDeployLog(errorMessage, true);

      return false;
    }
  }

  // 部署或更新L4D2服务器
  async deployServer(
    steamUser,
    steamPassword,
    serverName,
    interactive = false,
  ) {
    try {
      // 检查SteamCMD
      let steamcmdExists = await this.checkSteamCMD();
      if (!steamcmdExists) {
        logger.steamcmd.info("未找到SteamCMD，开始下载");
        // 下载SteamCMD
        const downloadSuccess = await this.downloadSteamCMD();
        logger.steamcmd.info(
          `SteamCMD下载-解压: ${downloadSuccess ? "成功" : "失败"}`,
        );
        // 再次检查
        steamcmdExists = await this.checkSteamCMD();
        if (!steamcmdExists) {
          logger.steamcmd.error("SteamCMD安装失败");
          this.addDeployLog("SteamCMD安装失败", true);
          throw new Error("下载或安装SteamCMD失败");
        }
      }

      // 确定服务器路径
      let targetServerPath = this.serverPath;
      if (serverName) {
        // 如果指定了服务器名称，使用SERVER_PATH下的对应子目录
        await tools.ensureDirectoryExists(this.serverPath);
        targetServerPath = path.join(this.serverPath, serverName);
      }

      // 确保服务器目录存在
      tools.ensureDirectoryExists(targetServerPath);

      logger.steamcmd.info(`开始服务器部署，用户: ${steamUser}`);

      // 构建SteamCMD命令
      let steamcmdExePath = path.join(this.steamcmdPath, this.steamcmdExe);
      let cmdArgs;
      const platform = process.platform;

      logger.steamcmd.info(`=== 平台检测 ===`);
      logger.steamcmd.info(`进程平台: ${platform}`);
      logger.steamcmd.info(`架构: ${process.arch}`);

      // 确定目标平台类型
      let targetPlatform;
      if (platform === "win32") {
        // Windows平台，使用匿名登录，指定下载Windows版本
        targetPlatform = "windows";
        // 构建命令，包含登录信息
        cmdArgs = [
          "+@sSteamCmdForcePlatformType",
          targetPlatform,
          "+force_install_dir",
          targetServerPath,
          "+login",
          ...(!Boolean(steamUser?.trim()) || !Boolean(steamPassword?.trim())
            ? ["anonymous"]
            : [steamUser, steamPassword]),
        ];
      } else {
        // Linux平台或其他类Unix平台，使用用户提供的账号密码，指定下载Linux版本
        targetPlatform = "linux";
        // 构建命令，Linux平台必须使用账号密码
        cmdArgs = [
          "+@sSteamCmdForcePlatformType",
          targetPlatform,
          "+force_install_dir",
          targetServerPath,
          "+login",
          steamUser,
          steamPassword,
        ];
      }

      // 添加通用命令
      cmdArgs.push("+app_update", "222860", "validate", "+quit");
      if (!interactive) {
        cmdArgs = [];
      }
      logger.steamcmd.info(`=== 部署配置 ===`);
      logger.steamcmd.info(`部署命令参数: ${cmdArgs.join(" ")}`);

      // 执行SteamCMD命令
      return (async () => {
        try {
          let steamcmdProcess;
          const platform = process.platform;
          const self = this; // 保存this引用

          // 使用node-pty创建伪终端，解决Windows平台的输出缓冲问题
          logger.steamcmd.info("使用node-pty创建SteamCMD进程");
          let command, args;
          if (platform === "win32") {
            // Windows平台
            command = steamcmdExePath;
            args = cmdArgs;
          } else {
            // Linux平台
            steamcmdExePath = path.join(
              this.steamcmdPath,
              "linux32",
              this.steamcmdLinux32,
            );
            // 先检查sh文件是否存在-不存在则执行二进制文件
            // if (!(await tools.fileExists(steamcmdShPath))) {
            //   logger.steamcmd.error(`SteamCMD.sh文件不存在-尝试执行二进制文件`);
            //   //直接执行linux32目录下的steamcmd二进制文件
            //   steamcmdShPath = path.join(
            //     this.steamcmdPath,
            //     "linux32",
            //     this.steamcmdLinux32,
            //   );
            //   if (!(await tools.fileExists(steamcmdShPath))) {
            //     logger.steamcmd.error(`SteamCMD二进制文件不存在`);
            //     this.addDeployLog(`SteamCMD二进制文件不存在`, true);
            //     throw new Error(`SteamCMD二进制文件不存在`);
            //   }
            // }
            command = steamcmdExePath;
            args = cmdArgs;
          }

          logger.steamcmd.info(`当前平台: ${platform}`);
          logger.steamcmd.info(`SteamCMD可执行文件路径: ${steamcmdExePath}`);
          logger.steamcmd.info(`服务器路径: ${this.serverPath}`);
          logger.steamcmd.info(`命令参数: ${cmdArgs.join(" ")}`);
          logger.steamcmd.info(`正在执行SteamCMD: ${command}`);
          logger.steamcmd.info(`命令: ${command} ${args.join(" ")}`);

          // 使用node-pty创建伪终端
          steamcmdProcess = pty.spawn(command, args, {
            name: "xterm-color",
            cwd: this.steamcmdPath,
            env: process.env,
          });

          logger.steamcmd.info("使用node-pty成功创建SteamCMD进程");

          return new Promise((resolve, reject) => {
            // 存储部署进程
            if (global.deployStatus) {
              global.deployStatus.process = steamcmdProcess;
            }
            let output = "";
            // 实时处理终端输出（node-pty使用单个data事件）
            // 存储已处理的进度信息，用于去重
            const processedProgressLines = new Set();

            const processOutput = (data) => {
              try {
                // 立即转换为字符串并处理
                const outputStr = data
                  .toString("utf8")
                  .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "") // 移除ANSI转义序列
                  .replace(/[\x00-\x1F\x7F-\x9F]/g, "") // 移除控制字符
                  .replace(/\r\n/g, "\n") // 统一换行符
                  .replace(/\s+/g, " ") // 压缩多余的空白字符
                  .trim(); // 移除首尾空白
                output += outputStr;

                // 立即处理每一行输出
                const lines = outputStr.split("\n");
                for (const line of lines) {
                  if (line.trim()) {
                    console.log("处理SteamCMD输出行:", line.trim());

                    // 检查是否是进度信息
                    const isProgressLine =
                      line.includes("Update state") ||
                      line.includes("Downloading") ||
                      line.includes("Extracting");

                    // 去重处理：如果是进度信息且已经处理过，则跳过
                    if (
                      isProgressLine &&
                      processedProgressLines.has(line.trim())
                    ) {
                      continue;
                    }

                    // 添加到已处理集合
                    if (isProgressLine) {
                      processedProgressLines.add(line.trim());
                      logger.steamcmd.info(`SteamCMD进度: ${line.trim()}`);
                    }

                    // 检查是否是错误信息
                    const isError =
                      line.includes("Error") ||
                      line.includes("Failed") ||
                      line.includes("error");
                    if (isError) {
                      logger.steamcmd.error(`SteamCMD错误: ${line.trim()}`);
                    }

                    // 立即添加到部署日志
                    self.addDeployLog(line.trim(), isError);
                  }
                }
              } catch (error) {
                logger.steamcmd.error(`处理输出时出错: ${error.message}`);
              }
            };

            // 捕获终端输出（node-pty使用单个data事件）
            steamcmdProcess.on("data", processOutput);

            // 处理进程退出
            steamcmdProcess.on("exit", (code) => {
              // 检查当前部署状态，如果已经是 cancelled，则保持状态不变
              if (
                global.deployStatus &&
                global.deployStatus.status === "cancelled"
              ) {
                logger.steamcmd.info("服务器部署已取消");
                return;
              }

              if (code === 0) {
                logger.steamcmd.info("服务器部署成功完成");
                self.addDeployLog(`服务器部署成功完成`, false);
                // 更新部署状态为完成
                self.updateDeployStatus("completed", false);

                resolve({
                  success: true,
                  message: "服务器部署成功完成",
                  output,
                });
              } else {
                logger.steamcmd.error(`服务器部署失败，退出代码: ${code}`);
                logger.steamcmd.error(`完整输出: ${output}`);

                // 处理常见的SteamCMD退出代码
                let errorMessage = `部署失败，退出代码: ${code}`;

                // 更新部署状态为失败
                self.updateDeployStatus("failed", false);

                reject(new Error(errorMessage));
              }
            });

            // 处理进程错误
            steamcmdProcess.on("error", (error) => {
              // 检查当前部署状态，如果已经是 cancelled，则保持状态不变
              if (
                global.deployStatus &&
                global.deployStatus.status === "cancelled"
              ) {
                logger.steamcmd.info("服务器部署已取消");
                self.addDeployLog(`服务器部署已取消`, false);
                resolve({
                  success: true,
                  message: "Server deployment was cancelled",
                  output,
                });
                return;
              }

              // 记录详细的错误信息
              logger.steamcmd.error(`SteamCMD进程错误: ${error.message}`);
              logger.steamcmd.error(`错误堆栈: ${error.stack}`);

              // 尝试关闭进程
              if (steamcmdProcess) {
                try {
                  steamcmdProcess.kill();
                } catch (killError) {
                  logger.steamcmd.error(
                    `关闭SteamCMD进程失败: ${killError.message}`,
                  );
                }
              }
              // 更新部署状态为失败
              self.updateDeployStatus("failed", false);

              reject(error.message);
            });
          });
        } catch (error) {
          logger.steamcmd.error(`创建SteamCMD进程失败: ${error.message}`);
          throw new Error(`创建SteamCMD进程失败: ${error.message}`);
        }
      })();
    } catch (error) {
      this.addDeployLog(`SteamCMD进程错误: ${error}`, true);
      // 更新部署状态为失败
      this.updateDeployStatus("failed", false);
      errorHandler.handleSteamCmdError(error);
    }
  }

  /**
   * 取消服务器部署
   * @returns {Promise<boolean>} 是否成功取消部署
   */
  async cancelDeploy() {
    if (global.deployStatus.status !== "in_progress") {
      return res.json({
        message: "没有正在进行的部署操作",
        status: global.deployStatus.status,
      });
    }

    // 取消部署操作
    this.addDeployLog(`取消部署`, false);
    // global.deployStatus.logs.push(`[${tools.formatTime()}] 部署已取消`);
    global.deployStatus.status = "cancelled";

    // 停止部署进程
    if (global.deployStatus.process) {
      try {
        const pid = global.deployStatus.process.pid;
        logger.server.info(`尝试杀死部署进程，PID: ${pid}`);

        // 根据平台选择不同的杀死进程方法
        if (process.platform === "win32") {
          // Windows 平台：使用 taskkill 命令强制杀死进程及其子进程
          try {
            // /F 强制终止进程，/T 终止进程及其子进程
            execSync(`taskkill /F /T /PID ${pid}`, { stdio: "ignore" });
            logger.server.info(
              `Windows: 使用 taskkill 强制终止进程 ${pid} 及其子进程`,
            );
          } catch (taskkillError) {
            // taskkill 失败时，尝试使用 Node.js 的 kill 方法
            logger.server.warn(
              `taskkill 失败，尝试使用 Node.js kill: ${taskkillError.message}`,
            );
            global.deployStatus.process.kill();
          }
        } else {
          // Linux/Mac 平台：使用 SIGKILL 信号
          const killResult = global.deployStatus.process.kill("SIGKILL");
          logger.server.info(`Linux/Mac: 使用 SIGKILL 强制终止进程 ${pid}`);
          if (!killResult) {
            // kill 方法失败时，尝试使用 SIGTERM 信号
            logger.server.warn(`kill 方法失败，尝试使用 kill -9 ${pid}`);
            execSync(`kill -9 ${pid}`, { stdio: "ignore" });
          }
        }

        this.addDeployLog(`部署进程已停止`, false);
        logger.server.info("部署进程已强制终止");
      } catch (error) {
        const errorMessage = `停止部署进程时出错: ${error.message}`;
        this.addDeployLog(`${errorMessage}`, true);
        logger.server.error(errorMessage);
      }
    } else {
      // 进程不存在，可能是已经完成或未开始
      const warningMessage = "部署进程不存在，可能已经完成或未开始";
      this.addDeployLog(`${warningMessage}`, true);
      logger.server.warn(warningMessage);
    }

    // 清除进程引用
    global.deployStatus.process = null;
    // 通过WebSocket发送状态更新
    // if (global.websocketService) {
    //   global.websocketService.broadcast("deploy_status", {
    //     status: "cancelled",
    //     deploying: false,
    //   });
    // }
    this.updateDeployStatus("cancelled", false);
    // 保存部署状态
    // global.saveDeployStatus(global.deployStatus);
    return true;
  }

  // 验证服务器是否已部署
  async verifyServer() {
    try {
      // 检查SERVER_PATH下是否有服务器目录
      if (await tools.fileExists(this.serverPath)) {
        const serverDirs = fs.readdirSync(this.serverPath);
        console.log("打印服务器目录:", serverDirs);
        // 检查是否有有效的服务器目录（包含启动文件）
        const hasValidServers = serverDirs.some((dir) => {
          const dirPath = path.join(this.serverPath, dir);

          // 检查是否是服务器目录
          if (
            !fs.statSync(dirPath).isDirectory() ||
            !dir.startsWith("server")
          ) {
            return false;
          }

          // 根据平台检查启动文件
          const isWindows = process.platform === "win32";
          const serverExe = isWindows ? "srcds.exe" : "srcds_run";
          const serverExePath = path.join(dirPath, serverExe);

          // 检查启动文件是否存在
          return tools.fileExists(serverExePath);
        });

        if (hasValidServers) {
          logger.steamcmd.info(
            `服务器验证成功: 在 ${this.serverPath} 找到有效的服务器`,
          );
          return true;
        }
      }

      logger.steamcmd.error(
        `Server directory not found or no valid servers deployed in: ${this.serverPath}`,
      );
      return false;
    } catch (error) {
      errorHandler.handleSteamCmdError(error);
      return false;
    }
  }
}

export default new SteamCMDService();
