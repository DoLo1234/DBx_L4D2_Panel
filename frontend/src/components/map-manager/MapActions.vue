<template>
  <div class="map-actions">
    <el-button :title="uploadTitle" @click="handleUploadFile">
      <template #icon>
        <Icon icon="mdi:upload" />
      </template>
    </el-button>
    <el-button title="分配" @click="handleMapAssign">
      <template #icon>
        <Icon icon="mdi:map-marker-plus" />
      </template>
    </el-button>
    <el-button title="取消分配" @click="handleMapUnassign">
      <template #icon>
        <Icon icon="mdi:map-marker-remove" />
      </template>
    </el-button>
    <!-- 刷新按钮 -->
    <el-button title="刷新" @click="handleRefresh">
      <template #icon>
        <Icon icon="mdi:refresh" />
      </template>
    </el-button>
    <el-button title="删除" @click="handleDeleteFile">
      <template #icon>
        <Icon icon="mdi:delete" />
      </template>
    </el-button>
    <el-button
      title="解压"
      @click="handleExtractMap(selectedFiles)"
      v-if="canExtractMap"
    >
      <template #icon>
        <Icon icon="mingcute:file-zip-fill" />
      </template>
    </el-button>

    <el-input
      v-model="searchKeyword"
      clearable
      placeholder="搜索文件..."
      class="search-input"
    >
      <template #prefix>
        <Icon icon="mdi:magnify" />
      </template>
    </el-input>
  </div>
</template>

<script setup>
import { Icon } from "@iconify/vue";
import { computed } from "vue";

const props = defineProps({
  uploadTitle: {
    type: String,
    default: "上传",
  },
  selectedFiles: {
    type: Array,
    default: () => [],
  },
});

const searchKeyword = defineModel("searchKeyword", "");

const emit = defineEmits([
  "uploadFile",
  "mapAssign",
  "mapUnassign",
  "refresh",
  "deleteFile",
  "extractMap",
]);

// 计算属性：判断是否可以执行地图分配操作
const canAssignMap = computed(() => {
  return (
    props.selectedFiles.length > 0 &&
    !props.selectedFiles.some((file) => file.type === "directory")
  );
});

// 计算属性：判断是否可以执行删除文件操作
const canDeleteFile = computed(() => {
  return props.selectedFiles.length > 0;
});

// 计算属性：判断是否可以执行解压地图操作
const canExtractMap = computed(() => {
  if (props.selectedFiles.length === 0) return false;
  if (props.selectedFiles.some((file) => file.type === "directory"))
    return false;

  // 判断是否都是压缩包文件
  const archiveExtensions = [
    ".zip",
    ".7z",
    ".rar",
    ".tar",
    ".gz",
    ".bz2",
    ".xz",
    ".tar.gz",
    ".tar.bz2",
    ".tar.xz",
    ".tgz",
    ".tbz2",
    ".txz",
  ];
  return props.selectedFiles.every((file) => {
    const ext = file.name
      ? file.name.toLowerCase().substring(file.name.lastIndexOf("."))
      : "";
    return archiveExtensions.includes(ext);
  });
});

const handleUploadFile = () => {
  emit("uploadFile");
};

const handleMapAssign = () => {
  emit("mapAssign");
};

const handleMapUnassign = () => {
  emit("mapUnassign");
};

const handleRefresh = () => {
  emit("refresh");
};

const handleDeleteFile = () => {
  emit("deleteFile");
};

const handleExtractMap = (files) => {
  emit("extractMap", files);
};
</script>

<style scoped lang="scss">
.map-actions {
  display: flex;
  gap: 10px 5px;
  .el-button {
    margin-left: 0;
  }
}

.search-input {
  min-width: 20px;
}
</style>
