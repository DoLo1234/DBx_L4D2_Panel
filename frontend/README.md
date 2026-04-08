# L4D2 管理面板 🎮

一个功能强大的 Left 4 Dead 2 服务器管理面板，用于管理和监控 L4D2 服务器实例、插件和文件。

## 📋 项目简介

L4D2 管理面板是一个基于 Vue 3 + Express 的 Web 应用，提供了直观的界面来管理 L4D2 服务器。它支持多服务器实例管理、插件管理、文件管理和实时日志查看等功能。

## ✨ 功能特性

### 🎯 核心功能
- **服务器实例管理**：创建、启动、停止、重启服务器实例
- **插件管理**：上传、安装、卸载、修改插件
- **文件管理**：浏览、编辑、上传、下载服务器文件
- **实时日志**：查看服务器实时运行日志
- **WebSocket 通信**：实时更新服务器状态

### 🛠️ 技术特性
- **现代化前端**：Vue 3 + Vite + Element Plus
- **高性能后端**：Express + Node.js
- **分块上传**：支持大文件上传
- **响应式设计**：适配不同屏幕尺寸
- **Docker 部署**：支持容器化部署

## 🚀 快速开始

### 环境要求
- Node.js 16+ 
- npm 7+ 或 yarn 1.22+
- Docker（可选，用于容器化部署）
- L4D2 服务器

### 安装步骤

#### 1. 克隆项目
```bash
git clone https://github.com/your-username/l4d2-manager.git
cd l4d2-manager/frontend
```

#### 2. 安装依赖
```bash
npm install
```

#### 3. 配置环境变量
创建 `.env` 文件并配置以下变量：
```env
VITE_API_BASE_URL=http://localhost:11214
```

#### 4. 开发模式运行
```bash
npm run dev
```

#### 5. 构建生产版本
```bash
npm run build
```

## 🐳 Docker 部署

### 1. 构建镜像
```bash
cd ..  # 回到 l4d2 目录
docker-compose build
```

### 2. 启动服务
```bash
docker-compose up -d
```

### 3. 访问面板
打开浏览器访问：`http://your-server-ip:11214`

## 📁 项目结构

```
frontend/
├── public/            # 静态资源
├── src/               # 源代码
│   ├── assets/        # 资源文件
│   ├── components/    # 组件
│   ├── views/         # 页面
│   ├── api/           # API 调用
│   ├── router/        # 路由
│   ├── stores/        # 状态管理
│   └── utils/         # 工具函数
├── backend/           # 后端代码
│   ├── config/        # 配置
│   ├── middleware/    # 中间件
│   ├── routes/        # 路由
│   ├── services/      # 服务
│   └── utils/         # 工具函数
├── dist/              # 构建输出
└── docker-compose.yml # Docker 配置
```

## 🎮 使用指南

### 服务器管理
1. **添加服务器**：点击「新增服务器」按钮，填写服务器信息
2. **启动服务器**：在服务器列表中点击「启动」按钮
3. **停止服务器**：在服务器列表中点击「停止」按钮
4. **查看日志**：点击服务器右侧的「日志」按钮查看实时日志

### 插件管理
1. **上传插件**：点击「上传插件」按钮，选择插件文件夹
2. **安装插件**：在左侧可用插件列表中选择插件，点击「安装」按钮
3. **卸载插件**：在右侧已安装插件列表中选择插件，点击「卸载」按钮
4. **修改插件**：在左侧可用插件列表中选择插件，点击「修改插件」按钮编辑插件文件

### 文件管理
1. **浏览文件**：在文件管理器中浏览服务器文件
2. **编辑文件**：双击文件或选择文件后点击「预览文件」按钮
3. **上传文件**：点击「上传文件」按钮上传文件
4. **创建文件/文件夹**：点击「新增文件」或「新增文件夹」按钮

## 🔧 配置说明

### 后端配置
在 `backend/config/index.js` 中配置：
- `serverPath`：L4D2 服务器安装路径
- `steamcmdPath`：SteamCMD 安装路径
- 其他配置项

### Docker 配置
在 `docker-compose.yml` 中配置：
- 环境变量
- 卷挂载路径
- 端口映射

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进这个项目！

## 📄 许可证

MIT License

## 🎉 致谢

- [Vue 3](https://vuejs.org/)
- [Element Plus](https://element-plus.org/)
- [Express](https://expressjs.com/)
- [Vite](https://vitejs.dev/)
- [Left 4 Dead 2](https://store.steampowered.com/app/550/Left_4_Dead_2/)

---

**享受你的 L4D2 服务器管理体验！** 🎮