#!/usr/bin/env node

import { execSync } from 'child_process';
import * as fs from 'fs';
import { platform } from 'os';
import path from 'path';

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

// 安装 PM2
function installPM2() {
  console.log("Installing PM2 globally... This may take a few seconds...");
  try {
    execSync("npm install -g pm2", { stdio: "inherit" });
    return true;
  } catch (error) {
    console.error(
      "Failed to install PM2. Please check your network connection.",
    );
    return false;
  }
}

// 检查后端服务状态
function checkBackendStatus() {
  try {
    const output = execSync("pm2 describe l4d2-backend", {
      encoding: "utf8",
    });
    return output.includes("status: online");
  } catch (error) {
    return false;
  }
}

// 启动后端服务
function startBackend() {
  try {
    execSync("pm2 start backend/index.js --name l4d2-backend", {
      stdio: "inherit",
    });
    return true;
  } catch (error) {
    console.error("Failed to start backend server.");
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

// 获取端口号
function getPort() {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const portMatch = envContent.match(/VITE_PORT=(\d+)/);
    if (portMatch) {
      return portMatch[1];
    }
  }
  return "11214";
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
    console.log(`${colors.red}❌ PM2 is not installed.${colors.reset}`);
    console.log(`${colors.yellow}📦 Installing PM2...${colors.reset}`);
    
    if (!installPM2()) {
      console.log(`${colors.cyan}Press any key to exit...${colors.reset}`);
      process.stdin.resume();
      process.stdin.on("data", process.exit.bind(process, 1));
      return;
    }
    console.log(`${colors.green}✅ PM2 installed successfully!${colors.reset}`);
  } else {
    console.log(`${colors.green}✅ PM2 is already installed.${colors.reset}`);
  }
  console.log();

  // 检查后端服务状态
  console.log(`${colors.yellow}🔍 Checking backend service status...${colors.reset}`);
  const isRunning = checkBackendStatus();
  
  if (isRunning) {
    console.log(`${colors.cyan}ℹ️  Backend service is already running.${colors.reset}`);
  } else {
    console.log(`${colors.cyan}ℹ️  Starting backend service...${colors.reset}`);
    console.log(`${colors.cyan}🚀 Initializing L4D2 Manager Backend...${colors.reset}`);
    
    if (!startBackend()) {
      console.log(`${colors.cyan}Press any key to exit...${colors.reset}`);
      process.stdin.resume();
      process.stdin.on("data", process.exit.bind(process, 1));
      return;
    }
    console.log(`${colors.green}✅ Backend server started successfully!${colors.reset}`);
  }
  console.log();

  // 显示服务器状态
  // console.log(`${colors.yellow}📋 Server status:${colors.reset}`);
  // showPM2List();
  console.log();

  // 显示最终消息
  console.log(`${colors.green}✅ Service started successfully!${colors.reset}`);
  console.log(`${colors.blue}🚀 L4D2 Manager is now running!${colors.reset}`);
  
  const port = getPort();
  console.log(`${colors.purple}🌐 Access URL: http://localhost:${port}${colors.reset}`);
  console.log(`${colors.cyan}📝 Server is managed by PM2 (auto-restart enabled)${colors.reset}`);
  console.log();
  
  console.log(`${colors.yellow}💡 Tips:${colors.reset}`);
  console.log(`${colors.cyan}  • To stop: node stop.js${colors.reset}`);
  console.log(`${colors.cyan}  • To check status: pm2 list${colors.reset}`);
  console.log(`${colors.cyan}  • To view logs: pm2 logs l4d2-backend${colors.reset}`);
  console.log();
  
  console.log(`${colors.green}🎉 All systems ready! Enjoy managing your L4D2 server!${colors.reset}`);
  console.log();
  console.log(`${colors.cyan}Press any key to exit...${colors.reset}`);
  
  process.stdin.resume();
  process.stdin.on("data", process.exit.bind(process, 0));
}

// 运行主函数
main();
