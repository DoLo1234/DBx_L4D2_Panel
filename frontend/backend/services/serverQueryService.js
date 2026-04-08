/**
 * 服务器查询服务
 * 使用gamedig获取游戏服务器信息，使用rcon-client发送命令
 */
import { Rcon } from "rcon-client";
import { GameDig } from "gamedig";

class ServerQueryService {
  constructor() {
    this.rconConnections = new Map();
  }

  /**
   * 获取L4D2服务器信息
   * @param {string} host - 服务器IP地址
   * @param {number} port - 服务器端口
   * @returns {Promise<Object>} 服务器信息
   */
  async getServerInfo(host, port = 27015) {
    try {
      const result = await GameDig.query({
        type: "l4d2",
        host: host,
        port: port,
        givenPortOnly: true,
        ipFamily: 4,
        maxRetries: 5,
      });
      console.log("获取服务器信息成功:", result);
      return {
        name: result.name,
        map: result.map,
        players: result.players.length,
        maxPlayers: result.maxplayers,
        ping: result.ping,
        playersList: result.players,
        bots: result.bots || [],
        version: result.version || "Unknown",
        password: result.password,
        connect: result.connect,
        queryPort: result.queryPort,
        game: result.raw?.game || "Left 4 Dead 2",
        tags: result.raw?.tags || [],
      };
    } catch (error) {
      console.error("获取服务器信息失败:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 发送RCON命令到服务器
   * @param {string} host - 服务器IP地址
   * @param {number} port - 服务器端口
   * @param {string} password - RCON密码
   * @param {string} command - 要执行的命令
   * @returns {Promise<Object>} 命令执行结果
   */
  async sendRconCommand(host, port = 27015, password, command) {
    try {
      // 构建连接键
      const connectionKey = `${host}:${port}`;

      // 检查是否已存在连接
      let rcon;
      if (this.rconConnections.has(connectionKey)) {
        rcon = this.rconConnections.get(connectionKey);
      } else {
        // 创建新的RCON连接
        rcon = await this.createRconConnection(host, port, password);
        this.rconConnections.set(connectionKey, rcon);
      }

      // 发送命令
      const response = await rcon.send(command);

      return response;
    } catch (error) {
      console.error("发送RCON命令失败:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 创建RCON连接
   * @param {string} host - 服务器IP地址
   * @param {number} port - 服务器端口
   * @param {string} password - RCON密码
   * @returns {Promise<Object>} RCON连接对象
   */
  async createRconConnection(host, port, password) {
    try {
      // 使用rcon-client库创建真实的RCON连接
      const rcon = await Rcon.connect({
        host: host,
        port: port,
        password: password,
        timeout: 5000, // 5秒超时
        maxRetries: 3, // 最大重试次数
      });

      console.log(`创建RCON连接成功: ${host}:${port}`);

      // 监听连接错误
      rcon.on("error", (error) => {
        console.error(`RCON连接错误 ${host}:${port}:`, error);
        // 从连接映射中移除错误的连接
        const connectionKey = `${host}:${port}`;
        this.rconConnections.delete(connectionKey);
      });

      // 监听连接关闭
      rcon.on("end", () => {
        console.log(`RCON连接关闭: ${host}:${port}`);
        // 从连接映射中移除关闭的连接
        const connectionKey = `${host}:${port}`;
        this.rconConnections.delete(connectionKey);
      });

      return rcon;
    } catch (error) {
      console.error("创建RCON连接失败:", error);
      throw error;
    }
  }

  /**
   * 关闭所有RCON连接
   */
  async closeAllConnections() {
    for (const [key, connection] of this.rconConnections.entries()) {
      try {
        await connection.end();
        console.log(`关闭RCON连接: ${key}`);
      } catch (error) {
        console.error(`关闭RCON连接失败 ${key}:`, error);
      }
    }
    this.rconConnections.clear();
  }
}
export default new ServerQueryService();
