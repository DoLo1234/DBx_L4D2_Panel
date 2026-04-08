FROM node:24

WORKDIR /app
# 安装必要的编译工具和依赖
RUN apt-get update && apt-get install -y curl bash lib32gcc-s1 ca-certificates screen build-essential python3 && rm -rf /var/lib/apt/lists/*
# 复制前端目录（使用相对路径）
COPY frontend ./frontend

# 验证前端目录存在
RUN ls -la ./frontend || echo "Frontend directory not found"

# 安装依赖并重新编译原生模块
RUN cd ./frontend && npm i pm2 -g && npm install && npm rebuild node-pty

# 构建前端应用
# RUN cd ./frontend && npm run build

# 复制应用配置目录
# COPY app ./app

# 验证应用目录存在
# RUN ls -la ./app || echo "App directory not found"

# 暴露端口
EXPOSE ${VITE_PORT:-11214}

# 启动后端服务
CMD ["node", "./frontend/backend/index.js"]