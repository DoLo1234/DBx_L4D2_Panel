import request from "../request";

/**
 * 地图管理相关API
 */
const mapApi = {
  /**
   * 分配地图
   * @param {string} mapName - 地图名称
   * @param {string} serverName - 服务器名称
   * @returns {Promise} - 分配结果
   */
  assignMap(mapName, serverName) {
    return request({
      url: "/map/assign",
      method: "post",
      data: { mapName, serverName },
    });
  },

  /**
   * 取消分配地图
   * @param {string} mapName - 地图名称
   * @param {string} serverName - 服务器名称
   * @returns {Promise} - 取消分配结果
   */
  unassignMap(mapName, serverName) {
    return request({
      url: "/map/unassign",
      method: "delete",
      data: { mapName, serverName },
    });
  },

  /**
   * 解压地图
   * @param {string} mapName - 地图名称
   * @param {boolean} deleteSource - 是否删除源文件
   * @returns {Promise} - 解压结果
   */
  extractMap(mapName, deleteSource = false) {
    return request({
      url: "/map/extract",
      method: "post",
      data: { mapName, deleteSource },
    });
  },

  /**
   * 获取地图统计数据
   * @param {string} serverName - 服务器名称
   * @returns {Promise} - 地图统计数据
   */
  getMapsOverview(serverName) {
    return request({
      url: "/map/overview",
      method: "get",
      params: { serverName },
    });
  },
};

export default mapApi;
