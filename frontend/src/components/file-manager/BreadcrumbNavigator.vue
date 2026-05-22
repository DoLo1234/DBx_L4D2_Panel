<template>
  <div class="breadcrumb">
    <el-breadcrumb separator="/">
      <el-breadcrumb-item @click="navigateToRoot">
        <span>根目录</span>
      </el-breadcrumb-item>
      <el-breadcrumb-item
        v-for="(item, index) in breadcrumbItems"
        :key="index"
        @click="navigateToPath(getPathForIndex(index))"
      >
        {{ item }}
      </el-breadcrumb-item>
    </el-breadcrumb>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  currentPath: {
    type: String,
    default: "",
  },
  initialPath: {
    type: String,
    default: "",
  },
  serverName: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["navigateToRoot", "navigateToPath"]);

const breadcrumbItems = computed(() => {
  // 规范化路径，统一使用正斜杠
  const normalizedPath = props.currentPath.replace(/\\/g, "/");
  const normalizedInitialPath = props.initialPath.replace(/\\/g, "/");

  // 移除初始路径前缀
  let relativePath = normalizedPath;
  if (normalizedInitialPath && relativePath.startsWith(normalizedInitialPath)) {
    relativePath = relativePath
      .substring(normalizedInitialPath.length)
      .replace(/^\/+|\/+$/g, "");
  }

  // 分割路径并过滤空项
  const pathSegments = relativePath.split("/").filter(Boolean);

  // 过滤掉服务器名称
  return pathSegments.filter((segment) => segment !== props.serverName);
});

const getPathForIndex = (index) => {
  // 规范化路径，统一使用正斜杠
  const normalizedPath = props.currentPath.replace(/\\/g, "/");
  const normalizedInitialPath = props.initialPath.replace(/\\/g, "/");

  // 移除初始路径前缀
  let relativePath = normalizedPath;
  if (normalizedInitialPath && relativePath.startsWith(normalizedInitialPath)) {
    relativePath = relativePath
      .substring(normalizedInitialPath.length)
      .replace(/^\/+|\/+$/g, "");
  }

  // 分割路径并过滤空项
  const pathSegments = relativePath
    .split("/")
    .filter(Boolean)
    .filter((segment) => segment !== props.serverName);

  // 构建路径
  return [normalizedInitialPath, ...pathSegments].slice(0, index + 2).join("/");
};

const navigateToRoot = () => {
  emit("navigateToRoot");
};

const navigateToPath = (path) => {
  emit("navigateToPath", path);
};
</script>

<style scoped lang="scss">
.breadcrumb {
  padding: 5px 10px;
  background-color: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.3s ease;
  margin: 5px 0;

  :deep(.el-breadcrumb__item) {
    .el-breadcrumb__inner {
      transition: color 0.3s ease;
      padding: 5px;
      &:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        background-color: rgba(150, 216, 233, 0.253);
        border-radius: 8px;
        text-decoration: underline;
        cursor: pointer;
        color: #1489ff !important;
      }
    }

    .el-breadcrumb__separator {
      margin: 0 8px;
      color: #c0c4cc;
    }
  }
}
</style>
