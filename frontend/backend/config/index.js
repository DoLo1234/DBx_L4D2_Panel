import path from "path";
import { fileURLToPath } from "url";

// 配置管理模块
class Config {
  constructor() {
    // 获取当前模块的目录路径
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // 项目根目录
    const projectRoot = path.resolve(__dirname, "../../..");

    // 服务器配置
    this.serverPath = process.env.SERVER_PATH || "D:\\l4d2server";

    // SteamCMD配置
    const platform = process.platform;
    if (platform === "win32") {
      this.steamcmdPath = process.env.STEAMCMD_PATH || "D:/steamcmd";
      this.steamcmdExe = "steamcmd.exe";
    } else {
      this.steamcmdPath = process.env.STEAMCMD_PATH || "/home/steam/steamcmd";
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
