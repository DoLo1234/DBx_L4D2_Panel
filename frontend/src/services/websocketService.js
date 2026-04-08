/**
 * WebSocket客户端服务
 * 用于接收实时部署日志，替代轮询
 */

class WebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.callbacks = {
      onLog: [],
      onStatus: [],
      onConnect: [],
      onDisconnect: [],
      onError: [],
    };
  }

  /**
   * 连接到WebSocket服务器
   */
  connect() {
    if (this.isConnected || this.isConnecting) {
      console.log("WebSocket已经连接或正在连接中");
      return;
    }

    this.isConnecting = true;

    // 构建WebSocket URL
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const hostname = window.location.hostname;
    const port = window.location.port;
    let wsUrl;
    console.log("环境:", import.meta.env.MODE);
    // 在开发环境中使用绝对路径，避免端口问题
    if (import.meta.env.MODE === "development") {
      wsUrl = `${import.meta.env.VITE_API_BASE_URL}`;
    } else {
      // 在生产环境中使用相对路径，避免硬编码端口
      wsUrl = `${protocol}//${hostname}${port ? `:${port}` : ""}`;
    }

    console.log("WebSocket连接中:", wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // console.log("WebSocket连接成功");
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.triggerCallbacks("onConnect");
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error("WebSocket消息解析失败:", error);
        }
      };

      this.ws.onclose = () => {
        console.log("WebSocket连接关闭");
        this.isConnected = false;
        this.isConnecting = false;
        this.triggerCallbacks("onDisconnect");
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket错误:", error);
        this.isConnecting = false;
        this.triggerCallbacks("onError", error);
      };
    } catch (error) {
      console.error("WebSocket连接失败:", error);
      this.isConnecting = false;
      this.triggerCallbacks("onError", error);
      this.attemptReconnect();
    }
  }

  /**
   * 处理WebSocket消息
   * @param {Object} data - 消息数据
   */
  handleMessage(data) {
    switch (data.type) {
      case "deploy_log":
        this.triggerCallbacks("onLog", data.data);
        break;
      case "deploy_logs_batch":
        if (Array.isArray(data.data)) {
          data.data.forEach((logItem) => {
            if (logItem.type === "deploy_log" && logItem.data) {
              this.triggerCallbacks("onLog", logItem.data);
            }
          });
        }
        break;
      case "deploy_status":
        this.triggerCallbacks("onStatus", data.data);
        break;
      default:
        console.log("未知的WebSocket消息类型:", data.type);
    }
  }

  /**
   * 尝试重连
   */
  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `WebSocket重连尝试 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`,
      );

      // 指数退避策略，增加重连延迟，最大限制为30秒
      const delay = Math.min(
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
        30000,
      );

      setTimeout(() => this.connect(), delay);
    } else {
      console.error("WebSocket重连失败，已达到最大尝试次数");
      // 5分钟后重置重连计数器
      setTimeout(
        () => {
          this.reconnectAttempts = 0;
          console.log("WebSocket重连计数器已重置，允许再次尝试连接");
        },
        5 * 60 * 1000,
      );
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  /**
   * 注册回调函数
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  on(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].push(callback);
    }
  }

  /**
   * 移除回调函数
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  off(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event] = this.callbacks[event].filter(
        (cb) => cb !== callback,
      );
    }
  }

  /**
   * 触发回调函数
   * @param {string} event - 事件名称
   * @param {any} data - 事件数据
   */
  triggerCallbacks(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error("回调函数执行失败:", error);
        }
      });
    }
  }

  /**
   * 检查WebSocket连接状态
   * @returns {boolean} 连接状态
   */
  getConnectionStatus() {
    return this.isConnected;
  }
}

// 导出单例
export default new WebSocketService();
