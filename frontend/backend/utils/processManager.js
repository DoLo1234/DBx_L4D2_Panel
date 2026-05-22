/**
 * 进程管理工具：PM2
 */
import { exec, spawn } from "child_process";
import pm2 from "pm2";
import { promisify } from "util";
import os from "os";

// 全局状态 & 工具函数
let pm2Connected = false;
const execAsync = promisify(exec);
const isWindows = os.platform() === "win32";

/**
 * 初始化 PM2 全局连接（仅一次）
 */
export const initPM2 = async () => {
  if (pm2Connected) return;
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) {
        const errMsg = `PM2 连接失败: ${err?.message || "未知错误"}`;
        reject(new Error(errMsg));
        return;
      }
      pm2Connected = true;
      resolve();
    });
  });
};

// PM2 连接兜底清理
process.on("exit", () => pm2Connected && pm2.disconnect());
process.on("SIGINT", () => pm2Connected && pm2.disconnect());

/**
 * ======================
 * 通用方法（主流程）
 * ======================
 */
export const startProcess = async (options) => {
  try {
    await initPM2();
    const { name } = options;

    // 非 Windows 平台：保留原逻辑
    return new Promise((resolve, reject) => {
      pm2.start(options, (pm2Err, pm2ProcessInfo) => {
        if (pm2Err) {
          const errMsg = `PM2 启动失败: ${pm2Err?.message || "未知错误"}`;
          reject(new Error(errMsg));
          return;
        }

        if (!pm2ProcessInfo || pm2ProcessInfo.length === 0) {
          reject(new Error("PM2 启动成功，但未返回进程信息"));
          return;
        }

        resolve({
          pid: pm2ProcessInfo[0].pid,
          name,
          pm_id: pm2ProcessInfo[0].pm_id,
          status: pm2ProcessInfo[0].pm2_env?.status || "unknown",
        });
      });
    });
  } catch (err) {
    throw new Error(`启动进程前置失败: ${err?.message || "未知错误"}`);
  }
};

/**
 * 停止进程（兼容所有场景）
 */
export const stopProcess = async (target) => {
  try {
    await initPM2();
    return new Promise((resolve, reject) => {
      pm2.delete(target, async (pm2Err) => {
        if (pm2Err) {
          if (pm2Err.message.includes("not found")) {
            console.log(`ℹ️ PM2 进程 ${target} 已不存在`);
            resolve();
            return;
          }
          const errMsg = `PM2 停止失败: ${pm2Err?.message || "未知错误"}`;
          reject(new Error(errMsg));
          return;
        }

        console.log(`✅ PM2 进程 ${target} 及 L4D2 已停止`);
        resolve();
      });
    });
  } catch (err) {
    throw new Error(`停止进程前置失败: ${err?.message || "未知错误"}`);
  }
};

/**
 * 获取 PM2 进程列表（标准化）
 */
export const getProcessList = async () => {
  try {
    await initPM2();
    return new Promise((resolve, reject) => {
      pm2.list((listErr, processes) => {
        if (listErr) {
          const errMsg = `获取 PM2 进程列表失败: ${listErr?.message || "未知错误"}`;
          reject(new Error(errMsg));
          return;
        }
        resolve(
          processes.map((p) => ({
            name: p.name,
            pid: p.pid,
            pm_id: p.pm_id,
            status: p.pm2_env?.status || "unknown",
          })),
        );
      });
    });
  } catch (err) {
    throw new Error(`获取进程列表前置失败: ${err?.message || "未知错误"}`);
  }
};

/**
 * 启动服务器实例
 * @param {Object} options - 启动选项
 * @param {string} options.name - 实例名称
 * @param {string} options.srcdsPath - srcds可执行文件路径
 * @param {Array} options.cmdArgs - 命令行参数
 * @param {string} options.serverPath - 服务器目录路径
 * @returns {Promise<Object>} - 进程信息
 */
export const startServerInstance = async (options) => {
  const { name, srcdsPath, cmdArgs, serverPath } = options;

  return new Promise((resolve, reject) => {
    if (isWindows) {
      // 在 Windows 上使用 PM2 启动
      const startConfig = {
        name: name,
        script: srcdsPath,
        args: cmdArgs,
        cwd: serverPath,
        interpreter: "cmd.exe",
        interpreter_args: "/c",
        stdio: ["ignore", "pipe", "pipe"],
        autorestart: true,
        watch: false,
        exec_mode: "fork",
        restart_delay: 2000,
      };

      startProcess(startConfig)
        .then((processInfo) => {
          resolve({
            pid: processInfo.pid,
            name: processInfo.name,
            status: processInfo.status,
          });
        })
        .catch((error) => {
          reject(error);
        });
    } else {
      // 在 Linux 上，使用 screen 来管理服务器进程
      const sessionName = name;
      const fullCommand = `${srcdsPath} ${cmdArgs.join(" ")}`;
      // 创建 screen 命令：启动会话并等待其结束
      const screenCommand = `screen -dmS ${sessionName} bash -c "${fullCommand}"; while screen -list | grep -q "${sessionName}"; do sleep 1; done`;

      const startConfig = {
        name: name,
        script: "/bin/bash",
        args: ["-c", screenCommand],
        cwd: serverPath,
        autorestart: true,
        watch: false,
        interpreter: "none", // 禁用默认解释器
        stdio: ["ignore", "pipe", "pipe"],
        exec_mode: "fork",
        restart_delay: 2000,
        tree_kill: true, // 强制杀死整个进程树
        kill_timeout: 3000, // 停止时等待3秒再强制杀死
      };

      startProcess(startConfig)
        .then((processInfo) =>
          resolve({
            pid: processInfo.pid,
            name: processInfo.name,
            status: processInfo.status,
          }),
        )
        .catch((error) => reject(error));
    }
  });
};

/**
 * 停止指定的 screen 会话
 * @param {string} sessionName - screen 会话名称
 * @returns {Promise<boolean>} - 停止结果
 */
export const stopScreenSession = async (sessionName) => {
  if (isWindows) return true;

  try {
    console.log(`尝试停止 screen 会话: ${sessionName}`);
    // 先使用 PM2 尝试停止会话
    await stopProcess(sessionName);
    // 然后使用 screen 命令强制退出会话
    await execAsync(`screen -S ${sessionName} -X quit 2>/dev/null`);
    console.log(`已尝试停止 screen 会话: ${sessionName}`);
    return true;
  } catch (err) {
    console.warn(`停止 screen 会话失败: ${err?.message || "未知错误"}`);
    return false;
  }
};

/**
 * 停止服务器实例
 * @param {Object} options - 停止选项
 * @param {string} options.name - 实例名称
 * @param {number} options.pid - 进程 ID
 * @returns {Promise<boolean>} - 停止结果
 */
export const stopServerInstance = async (options) => {
  const { name } = options;

  try {
    if (isWindows) {
      // 使用 PM2 停止
      await stopProcess(name);
    } else {
      // 在 Linux 上，停止对应的 screen 会话
      await stopScreenSession(name);
    }

    return true;
  } catch (error) {
    console.error(`Error stopping instance: ${error.message}`);
    return false;
  }
};
