import request from "../request";

/**
 * 插件管理相关API
 */
const pluginApi = {
  /**
   * 获取可用插件列表
   * @returns {Promise} - 可用插件列表
   */
  getAvailablePlugins() {
    return request({
      url: "/plugin/available",
      method: "get",
    });
  },

  /**
   * 获取已安装插件列表
   * @param {string} server - 服务器名称
   * @returns {Promise} - 已安装插件列表
   */
  getInstalledPlugins(server) {
    return request({
      url: `/plugin/installed?server=${server}`,
      method: "get",
    });
  },

  /**
   * 安装插件
   * @param {string} pluginName - 插件名称
   * @param {string} server - 服务器名称
   * @returns {Promise} - 安装结果
   */
  installPlugin(pluginName, server) {
    return request({
      url: "/plugin/install",
      method: "post",
      data: { name: pluginName, server },
    });
  },

  /**
   * 卸载插件
   * @param {string} pluginName - 插件名称
   * @param {string} server - 服务器名称
   * @returns {Promise} - 卸载结果
   */
  uninstallPlugin(pluginName, server) {
    return request({
      url: "/plugin/uninstall",
      method: "delete",
      data: { name: pluginName, server },
    });
  },

  /**
   * 获取插件概览数据
   * @returns {Promise} - 插件概览数据
   */
  getPluginsOverview() {
    return request({
      url: "/plugin/overview",
      method: "get",
    });
  },
};

export default pluginApi;
