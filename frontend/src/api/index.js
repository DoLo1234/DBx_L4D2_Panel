import authApi from "./modules/auth";
import serverApi from "./modules/server";
import fileApi from "./modules/file";
import pluginApi from "./modules/plugin";
import logApi from "./modules/log";
import mapApi from "./modules/map";

/**
 * API模块导出
 */
const api = {
  auth: authApi,
  server: serverApi,
  file: fileApi,
  plugin: pluginApi,
  log: logApi,
  map: mapApi,
};

export default api;

// 导出单个模块（可选，方便直接导入）
export { authApi, serverApi, fileApi, pluginApi, logApi, mapApi };
