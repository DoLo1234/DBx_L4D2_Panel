<template>
  <!-- 文件列表 -->
  <div class="file-list-container" v-if="filteredFiles.length > 0">
    <div class="file-list">
      <div
        v-for="file in filteredFiles"
        :key="file.path"
        class="file-item"
        :class="{ selected: selectedFiles.some((f) => f.path === file.path) }"
        @click="toggleSelectFile(file)"
        @dblclick="handleDoubleClick(file)"
      >
        <div class="file-icon">
          <Icon
            v-if="file.type === 'directory'"
            icon="mdi:folder"
            style="color: #409eff"
          />
          <template v-else>
            <Icon
              v-if="assignedMapsComputed.includes(file.name)"
              icon="mdi:file-check"
              style="color: #67c23a"
            />
            <Icon v-else icon="mdi:file" style="color: #909399" />
          </template>
        </div>
        <div class="file-name">{{ file.name }}</div>
        <div class="file-size" v-if="file.type === 'file'">
          {{ formatFileSize(file.size || 0) }}
        </div>
        <div class="file-size" v-else>文件夹</div>
      </div>
    </div>
  </div>
  <div class="empty-files" v-else>
    <el-empty description="当前目录为空" />
  </div>
</template>

<script setup>
import { Icon } from "@iconify/vue";
import { computed } from "vue";
const props = defineProps({
  filteredFiles: {
    type: Array,
    default: () => [],
  },
  selectedFiles: {
    type: Array,
    default: () => [],
  },
  assignedMaps: {
    type: Array,
    default: () => [],
  },
});
const emit = defineEmits(["toggleSelectFile", "handleDoubleClick"]);

const assignedMapsComputed = computed(() =>
  props.assignedMaps.map((map) => map.mapName),
);
const toggleSelectFile = (file) => {
  emit("toggleSelectFile", file);
};

const handleDoubleClick = (file) => {
  emit("handleDoubleClick", file);
};

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
</script>

<style scoped lang="scss">
.file-list-container {
  width: 100%;
  min-height: 200px;
}

.file-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  box-sizing: border-box;
}
.file-item:hover {
  background-color: #f5f7fa;
}

.file-item.selected {
  background-color: #ecf5ff;
}

.file-icon {
  font-size: 20px;
  margin-right: 5px;
  min-width: 24px;
  text-align: left;
}

.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  font-weight: 500;
  line-height: 1.4;
}

.file-size {
  font-size: 12px;
  color: #909399;
  text-align: right;
  margin-right: 10px;
}

.empty-files {
  text-align: center;
}
</style>
