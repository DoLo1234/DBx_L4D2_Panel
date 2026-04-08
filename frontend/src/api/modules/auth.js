import request from '../request';

/**
 * 认证相关API
 */
const authApi = {
  /**
   * 用户登录
   * @param {Object} data - 登录数据
   * @param {string} data.username - 用户名
   * @param {string} data.password - 密码
   * @returns {Promise} - 登录结果
   */
  login(data) {
    return request({
      url: '/auth/login',
      method: 'post',
      data
    });
  },

  /**
   * 用户注册
   * @param {Object} data - 注册数据
   * @param {string} data.username - 用户名
   * @param {string} data.password - 密码
   * @returns {Promise} - 注册结果
   */
  register(data) {
    return request({
      url: '/auth/register',
      method: 'post',
      data
    });
  },

  /**
   * 用户登出
   * @returns {Promise} - 登出结果
   */
  logout() {
    return request({
      url: '/auth/logout',
      method: 'post'
    });
  },

  /**
   * 获取用户信息
   * @returns {Promise} - 用户信息
   */
  getUserInfo() {
    return request({
      url: '/auth/info',
      method: 'get'
    });
  }
};

export default authApi;