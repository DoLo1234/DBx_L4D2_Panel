/**
 * 响应处理工具模块
 * 提供统一的API响应格式
 */

/**
 * 构建成功响应
 * @param {Object} res - Express响应对象
 * @param {Object} data - 响应数据
 * @param {string} message - 响应消息
 * @param {number} statusCode - HTTP状态码
 */
export function sendSuccessResponse(res, data = null, message = "操作成功", statusCode = 200) {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  res.status(statusCode).json(response);
}

/**
 * 构建失败响应
 * @param {Object} res - Express响应对象
 * @param {string} error - 错误信息
 * @param {number} statusCode - HTTP状态码
 */
export function sendErrorResponse(res, error, statusCode = 400) {
  res.status(statusCode).json({
    success: false,
    error,
  });
}

/**
 * 构建分页响应
 * @param {Object} res - Express响应对象
 * @param {Array} data - 分页数据
 * @param {number} total - 总记录数
 * @param {number} page - 当前页码
 * @param {number} pageSize - 每页记录数
 * @param {string} message - 响应消息
 */
export function sendPaginationResponse(res, data, total, page, pageSize, message = "操作成功") {
  res.json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
