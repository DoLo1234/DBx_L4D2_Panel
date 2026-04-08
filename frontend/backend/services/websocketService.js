/**
 * WebSocket服务
 * 用于实现实时通信，替代轮询获取部署日志
 */
import { WebSocketServer } from "ws";

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Set();
    this.maxConnections = 100; // 最大连接数限制
    this.connectionTimeout = 30 * 60 * 1000; // 连接超时时间（30分钟）
  }

  /**
   * 初始化WebSocket服务器
   * @param {http.Server} server - HTTP服务器实例
   */
  init(server) {
    this.wss = new WebSocketServer({
      server,
      maxPayload: 1024 * 1024, // 最大消息大小限制为1MB
      perMessageDeflate: {
        zlibDeflateOptions: {
          level: 1, // 压缩级别，1-9，1最快但压缩率最低
        },
        zlibInflateOptions: {
          chunkSize: 1024,
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: 1024, // 大于1KB的消息才压缩
      },
    });

    // 处理WebSocketServer错误
    this.wss.on("error", (error) => {
      console.error("WebSocket服务器错误:", error);
      // 这里可以添加更多的错误处理逻辑，例如重启WebSocket服务
    });

    this.wss.on("connection", (ws, req) => {
      // 检查连接数是否超过限制
      if (this.clients.size >= this.maxConnections) {
        console.warn("WebSocket连接数超过限制，拒绝新连接");
        ws.close(429, "Too many connections");
        return;
      }

      // 添加新客户端
      this.clients.add(ws);
      console.log("WebSocket客户端连接成功，当前连接数:", this.clients.size);

      // 设置连接超时
      const timeoutId = setTimeout(() => {
        if (ws.readyState === 1) {
          console.log("WebSocket连接超时，自动关闭");
          try {
            // 使用有效的WebSocket关闭代码 1008（消息违反策略）
            ws.close(1008, "Connection timeout");
          } catch (error) {
            console.error("关闭超时连接失败:", error);
          }
        }
      }, this.connectionTimeout);

      // 发送当前部署状态和历史日志
      if (global.deployStatus) {
        this.sendDeployInitialData(ws);
      }

      // 处理客户端断开连接
      ws.on("close", () => {
        clearTimeout(timeoutId);
        this.clients.delete(ws);
        console.log("WebSocket客户端断开连接，当前连接数:", this.clients.size);
      });

      // 处理客户端错误
      ws.on("error", (error) => {
        clearTimeout(timeoutId);
        // 忽略 ECONNRESET 错误，这是客户端正常断开连接的情况
        if (error.code !== "ECONNRESET") {
          console.error("WebSocket客户端错误:", error);
        }
        this.clients.delete(ws);
      });

      // 处理客户端消息
      ws.on("message", (message) => {
        clearTimeout(timeoutId); // 重置超时计时器
        // 可以在这里处理客户端发送的消息
        try {
          console.log("收到客户端消息:", message);
        } catch (error) {
          console.error("处理客户端消息失败:", error);
        }
      });
    });

    console.log("WebSocket服务器已初始化");
  }

  /**
   * 发送部署初始数据（历史日志和当前状态）
   * @param {WebSocket} ws - WebSocket客户端连接
   */
  sendDeployInitialData(ws) {
    try {
      if (ws.readyState !== 1) return;

      // 批量发送历史日志，减少网络往返
      const historyLogs = global.deployStatus.logs.map((log) => ({
        type: "deploy_log",
        data: log.replace(/^\[.*?\]\s*/, "") + "\n",
      }));

      // 发送历史日志批次
      ws.send(
        JSON.stringify({
          type: "deploy_logs_batch",
          data: historyLogs,
        }),
      );

      // 发送当前部署状态
      ws.send(
        JSON.stringify({
          type: "deploy_status",
          data: {
            status: global.deployStatus.status,
            deploying: global.deployStatus.status === "in_progress",
          },
        }),
      );
    } catch (error) {
      console.error("发送历史日志失败:", error);
      this.clients.delete(ws);
    }
  }

  /**
   * 广播消息给所有客户端
   * @param {string} type - 消息类型
   * @param {any} data - 消息数据
   */
  broadcast(type, data) {
    const message = JSON.stringify({ type, data });

    // 过滤出活跃的客户端，避免遍历所有客户端
    const activeClients = Array.from(this.clients).filter(
      (client) => client.readyState === 1,
    );

    if (activeClients.length === 0) return;

    activeClients.forEach((client) => {
      try {
        client.send(message);
      } catch (error) {
        console.error("WebSocket发送消息失败:", error);
        this.clients.delete(client);
      }
    });
  }

  /**
   * 发送部署日志消息
   * @param {string} log - 日志消息
   */
  sendDeployLog(log) {
    this.broadcast("deploy_log", log);
  }

  /**
   * 发送部署状态更新
   * @param {Object} status - 部署状态
   */
  sendDeployStatus(status) {
    this.broadcast("deploy_status", status);
  }

  /**
 * 清理无效连接
 */
  cleanupConnections() {
    const invalidClients = Array.from(this.clients).filter(
      (client) => client.readyState !== 1 && client.readyState !== 0,
    );

    invalidClients.forEach((client) => {
      this.clients.delete(client);
      console.log("清理无效WebSocket连接");
    });

    console.log("WebSocket连接清理完成，当前连接数:", this.clients.size);
  }

  /**
   * 关闭WebSocket服务器
   */
  close() {
    if (this.wss) {
      this.wss.close();
      this.clients.clear();
      console.log("WebSocket服务器已关闭");
    }
  }

  /**
   * 获取当前连接数
   * @returns {number} 当前连接数
   */
  getConnectionCount() {
    return this.clients.size;
  }
}

export default new WebSocketService();
