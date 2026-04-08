import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd());

  // 从环境变量中获取后端地址，默认使用 localhost:11214
  const backendUrl = env.VITE_API_BASE_URL || "http://localhost:11214";

  return {
    plugins: [vue()],
    server: {
      port: 11213,
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: "dist",
      assetsDir: "assets",
      rollupOptions: {
        output: {
          // 手动代码分割，将大型依赖包单独打包
          manualChunks(id) {
            if (id.includes("node_modules")) {
              return id
                .toString()
                .split("node_modules/")[1]
                .split("/")[0]
                .toString();
            }
          },
        },
      },
      // 调整警告阈值
      chunkSizeWarningLimit: 1000,
      // 配置 terser 来禁用所有 console 输出
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
    },
    // 配置@alias 别名
    resolve: {
      alias: {
        "@": "/src",
      },
    },
  };
});
