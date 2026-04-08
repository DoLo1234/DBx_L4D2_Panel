#!/usr/bin/env node

import { execSync } from 'child_process';
import { platform } from 'os';

// 清除屏幕
function clearScreen() {
  if (platform() === "win32") {
    execSync("cls", { stdio: "inherit" });
  } else {
    execSync("clear", { stdio: "inherit" });
  }
}

// 检查 PM2 是否安装
function checkPM2() {
  try {
    execSync("pm2 --version", { stdio: "ignore" });
    return true;
  } catch (error) {
    return false;
  }
}

// 停止后端服务
function stopBackend() {
  try {
    execSync("pm2 delete l4d2-backend", { stdio: "inherit" });
    return true;
  } catch (error) {
    console.error(
      "Failed to stop backend server. Please check if the server is running.",
    );
    return false;
  }
}

// 显示 PM2 进程列表
function showPM2List() {
  try {
    execSync("pm2 list", { stdio: "inherit" });
  } catch (error) {
    console.error("Failed to show PM2 process list.");
  }
}

// 定义颜色
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  purple: "\x1b[35m"
};

// 主函数
function main() {
  clearScreen();

  // 显示横幅
  console.log(`${colors.blue}╔════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║                    🎮 L4D2 Manager Server                              ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log();

  // 检查 PM2 安装
  console.log(`${colors.yellow}🔍 Checking PM2 installation...${colors.reset}`);
  if (!checkPM2()) {
    console.log(`${colors.red}❌ PM2 is not installed. Please run start.js first.${colors.reset}`);
    console.log(`${colors.cyan}Press any key to exit...${colors.reset}`);
    process.stdin.resume();
    process.stdin.on("data", process.exit.bind(process, 1));
    return;
  }
  console.log(`${colors.green}✅ PM2 is installed.${colors.reset}`);
  console.log();

  // 停止后端服务
  console.log(`${colors.yellow}🛑 Stopping L4D2 Manager Backend...${colors.reset}`);
  
  if (!stopBackend()) {
    console.log(`${colors.cyan}Press any key to exit...${colors.reset}`);
    process.stdin.resume();
    process.stdin.on("data", process.exit.bind(process, 1));
    return;
  }
  console.log(`${colors.green}✅ Backend server stopped successfully!${colors.reset}`);
  console.log();

  // 显示服务器状态
  // console.log(`${colors.yellow}📋 Server status:${colors.reset}`);
  // showPM2List();
  console.log();

  // 显示最终消息
  console.log(`${colors.green}✅ Service stopped successfully!${colors.reset}`);
  console.log(`${colors.blue}🛑 L4D2 Manager has been stopped.${colors.reset}`);
  console.log();
  
  console.log(`${colors.yellow}💡 Tips:${colors.reset}`);
  console.log(`${colors.cyan}  • To start: node start.js${colors.reset}`);
  console.log(`${colors.cyan}  • To check status: pm2 list${colors.reset}`);
  console.log(`${colors.cyan}  • To view logs: pm2 logs l4d2-backend${colors.reset}`);
  console.log();
  
  console.log(`${colors.cyan}Press any key to exit...${colors.reset}`);
  
  process.stdin.resume();
  process.stdin.on("data", process.exit.bind(process, 0));
}

// 运行主函数
main();
