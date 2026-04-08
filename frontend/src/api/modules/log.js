import request from '../request';

/**
 * 日志管理相关API
 */
const logApi = {
  /**
   * 获取日志列表
   * @param {Object} params - 查询参数
   * @param {string} [params.type] - 日志类型
   * @param {number} [params.limit] - 每页数量
   * @param {number} [params.page] - 当前页码
   * @returns {Promise} - 日志列表
   */
  getLogs(params = {}) {
    return request({
      url: '/log/get',
      method: 'get',
      params
    });
  },

  /**
   * 清空日志
   * @param {Object} data - 清空参数
   * @param {string} [data.type] - 日志类型
   * @returns {Promise} - 清空结果
   */
  clearLogs(data = {}) {
    return request({
      url: '/log/clear',
      method: 'post',
      data
    });
  }
};

export default logApi;
