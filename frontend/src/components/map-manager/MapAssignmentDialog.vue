<template>
  <!-- 地图分配对话框 -->
  <el-dialog
    v-model="visible"
    :title="`分配地图到 ${serverName}`"
    :width="isMobile ? '100%' : '60%'"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div class="map-assignment-dialog">
      <!-- 地图信息 -->
      <div v-if="mapInfo && mapInfo.length > 0" class="map-info">
        <header class="map-info-header">
          <h3>地图信息</h3>
          <el-tag>总文件大小: {{ formatSize(totalSize) }}</el-tag>
        </header>
        <div class="multiple-maps">
          <el-table :data="mapInfo" height="360" border>
            <el-table-column
              prop="name"
              label="地图名称"
              show-overflow-tooltip
            />
            <el-table-column
              prop="path"
              label="地图路径"
              show-overflow-tooltip
            />
            <el-table-column
              :formatter="(row) => formatSize(row.size)"
              label="文件大小"
              :width="isMobile ? 80 : 100"
            />
          </el-table>
        </div>
      </div>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button type="primary" @click="handleAssign" :loading="loading">
          {{ loading ? "分配中..." : "分配" }}
        </el-button>
        <el-button @click="visible = false" :disabled="loading">
          取消
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, inject } from "vue";
const visible = defineModel({
  default: false,
  type: Boolean,
});
const isMobile = inject("isMobile");
const props = defineProps({
  /**
   * 地图信息
   */
  mapInfo: {
    type: Array,
    default: () => [],
  },
  /**
   * 服务器名称
   */
  serverName: {
    type: String,
    default: "",
  },
  /**
   * 是否正在加载
   */
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["assignMap"]);

// 计算所有地图文件的大小总和
const totalSize = computed(() => {
  if (!props.mapInfo || props.mapInfo.length === 0) return 0;
  return props.mapInfo.reduce((total, file) => {
    // 假设size是数字类型的字节数
    return total + (file.size || 0);
  }, 0);
});

// 格式化文件大小
const formatSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// 处理分配
const handleAssign = () => {
  emit("assignMap", {
    mapInfo: props.mapInfo,
  });
};
</script>

<style scoped lang="scss">
.map-assignment-dialog {
  .map-info {
    margin-bottom: 20px;
    .map-info-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 14px;
      font-weight: 400;
      color: var(--el-text-color-primary);
    }
  }

  .server-selection {
    h3 {
      margin-bottom: 10px;
      font-size: 16px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: start;
  gap: 12px;
  padding: 15px 20px;
  border-top: 1px solid #ebeef5;
  background-color: #fafafa;
}
</style>
