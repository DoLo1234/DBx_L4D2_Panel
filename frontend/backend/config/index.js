import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
// 加载环境变量
dotenv.config();
// 配置管理模块
class Config {
  constructor() {
    // 获取当前模块的目录路径
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // 项目根目录
    const projectRoot = path.resolve(__dirname, "../../..");

    // 根据平台设置配置
    const platform = process.platform;

    // 服务器配置
    if (platform === "win32") {
      // Windows平台配置
      this.serverPath = process.env.SERVER_PATH;
      this.steamcmdPath = process.env.STEAMCMD_PATH;
      this.steamcmdExe = "steamcmd.exe";
    } else {
      // Linux平台配置
      this.serverPath = process.env.SERVER_PATH;
      this.steamcmdPath = process.env.STEAMCMD_PATH;
      // 暂时不用.sh文件，直接使用steamcmd
      this.steamcmdExe = "steamcmd.sh";
      this.steamcmdLinux32 = "steamcmd";
    }
    // 实例配置路径
    this.instancesPath = path.join(projectRoot, "app/instances");

    // 插件配置路径
    this.availablePluginsPath = path.join(projectRoot, "app/Available_Plugins");
    this.installedReceiptsPath = path.join(
      projectRoot,
      "app/Installed_Receipts",
    );
    this.sourcemodInstallersPath = path.join(
      projectRoot,
      "app/SourceMod_Installers",
    );

    // 日志配置
    this.logsPath = path.join(projectRoot, "app/logs");

    // 数据配置
    this.dataPath = path.join(projectRoot, "app/DeployPrints");

    // 地图配置
    this.mapsPath = path.join(projectRoot, "app/maps");

    // 地图分配数据路径
    this.assignMapData = path.join(projectRoot, "app/assignMapData");
  }
}

export default new Config();
