import request from "../request";

/**
 * 服务器相关API
 */
const serverApi = {
  /**
   * 获取服务器状态
   * @returns {Promise} - 服务器状态
   */
  getServerStatus() {
    return request({
      url: "/server/status",
      method: "get",
    });
  },

  /**
   * 获取服务器数量
   * @returns {Promise} - 服务器数量
   */
  getServerCount() {
    return request({
      url: "/server/count",
      method: "get",
    });
  },

  /**
   * 获取服务器列表
   * @returns {Promise} - 服务器列表
   */
  getServerList() {
    return request({
      url: "/server/list",
      method: "get",
    });
  },

  /**
   * 部署服务器
   * @param {Object} data - 部署数据
   * @param {string} data.steamUser - Steam用户名
   * @param {string} data.steamPassword - Steam密码
   * @param {string} [data.serverName] - 服务器名称（可选）
   * @param {boolean} [data.interactive] - 是否交互式部署（可选）
   * @returns {Promise} - 部署结果
   */
  deployServer(data) {
    return request({
      url: "/server/deploy",
      method: "post",
      data,
    });
  },

  /**
   * 取消部署
   * @returns {Promise} - 取消部署结果
   */
  cancelDeploy() {
    return request({
      url: "/server/deploy/cancel",
      method: "post",
    });
  },

  /**
   * 获取部署状态
   * @returns {Promise} - 部署状态
   */
  getDeployStatus() {
    return request({
      url: `/server/deploy/status?_t=${Date.now()}`,
      method: "get",
    });
  },

  /**
   * 获取部署日志
   * @returns {Promise} - 部署日志
   */
  getDeployLogs() {
    return request({
      url: `/server/deploy/logs?_t=${Date.now()}`,
      method: "get",
    });
  },

  /**
   * 添加服务器实例
   * @param {Object} data - 实例数据
   * @returns {Promise} - 添加结果
   */
  addInstance(data) {
    return request({
      url: "/server/instances",
      method: "post",
      data,
    });
  },

  /**
   * 编辑服务器实例
   * @param {string} name - 实例名称
   * @param {Object} data - 实例数据
   * @returns {Promise} - 编辑结果
   */
  editInstance(name, data) {
    return request({
      url: `/server/instances/${name}`,
      method: "put",
      data,
    });
  },

  /**
   * 删除服务器实例
   * @param {string} name - 实例名称
   * @returns {Promise} - 删除结果
   */
  deleteInstance(name) {
    return request({
      url: `/server/instances/${name}`,
      method: "delete",
    });
  },

  /**
   * 启动服务器实例
   * @param {Object} [params] - 启动实例对象
   * @returns {Promise} - 启动结果
   */
  startInstance(params) {
    return request({
      url: `/server/instances/start`,
      method: "post",
      data: params,
    });
  },

  /**
   * 停止服务器实例
   * @param {Object} [params] - 实例对象
   * @returns {Promise} - 停止结果
   */
  stopInstance(params) {
    return request({
      url: `/server/instances/stop`,
      method: "post",
      data: params,
    });
  },

  /**
   * 获取实例状态
   * @param {string} name - 实例名称
   * @returns {Promise} - 实例状态
   */
  getInstanceStatus(name) {
    return request({
      url: `/server/instances/${name}/status`,
      method: "get",
    });
  },

  /**
   * 获取所有实例状态
   * @returns {Promise} - 所有实例状态
   */
  getAllInstancesStatus() {
    return request({
      url: "/server/instances",
      method: "get",
    });
  },
  /**
   * 查询服务器实例
   * @param {Object} params - 查询参数
   * @param {string} params.host - 服务器IP地址
   * @param {number} [params.port=27015] - 服务器端口，默认27015
   * @returns {Promise} - 查询结果
   */
  queryServer(params) {
    return request({
      url: "/server/info",
      method: "get",
      params: params,
    });
  },
  /**
   * 发送RCON命令至服务器
   * @param {Object} params - 发送参数
   * @param {string} params.host - 服务器IP地址
   * @param {number} [params.port=27015] - 服务器端口，默认27015
   * @param {string} params.password - RCON密码
   * @param {string} params.command - 要执行的命令
   * @returns {Promise} - 发送结果
   */
  sendRconCommand(params) {
    return request({
      url: "/server/rcon",
      method: "post",
      data: params,
    });
  },

  /**
   * 发送部署命令
   * @param {string} command - 要执行的命令
   * @returns {Promise} - 发送结果
   */
  sendDeployCommand(command) {
    return request({
      url: "/server/deploy/command",
      method: "post",
      data: { command },
    });
  },
};

export default serverApi;
