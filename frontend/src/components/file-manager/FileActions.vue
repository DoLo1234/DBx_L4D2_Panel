<template>
  <div class="file-actions">
    <el-button :title="uploadTitle" @click="handleUploadFile">
      <template #icon>
        <Icon icon="mdi:upload" />
      </template>
    </el-button>
    <el-button title="新增文件" @click="handleCreateItem">
      <template #icon>
        <Icon icon="mdi:plus" />
      </template>
    </el-button>
    <!-- 刷新按钮 -->
    <el-button title="刷新" @click="handleRefresh">
      <template #icon>
        <Icon icon="mdi:refresh" />
      </template>
    </el-button>
    <el-button
      title="删除"
      @click="handleDeleteFile"
      :disabled="selectedFiles.length === 0"
    >
      <template #icon>
        <Icon icon="mdi:delete" />
      </template>
    </el-button>
    <el-button
      title="预览"
      @click="handleEditFile(selectedFiles[0])"
      :disabled="
        selectedFiles.length !== 1 || selectedFiles[0]?.type === 'directory'
      "
    >
      <template #icon>
        <Icon icon="mdi:eye" />
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

const props = defineProps({
  uploadTitle: {
    type: String,
    default: "上传文件",
  },
  selectedFiles: {
    type: Array,
    default: () => [],
  },
});

const searchKeyword = defineModel("searchKeyword", "");

const emit = defineEmits([
  "uploadFile",
  "createItem",
  "refresh",
  "deleteFile",
  "editFile",
]);

const handleUploadFile = () => {
  emit("uploadFile");
};

const handleCreateItem = () => {
  emit("createItem");
};

const handleRefresh = () => {
  emit("refresh");
};

const handleDeleteFile = () => {
  emit("deleteFile");
};

const handleEditFile = (file) => {
  emit("editFile", file);
};
</script>

<style scoped lang="scss">
.file-actions {
  display: flex;
  gap: 5px;
  .el-button {
    margin-left: 0;
  }
}

.search-input {
  min-width: 100px;
}
</style>
