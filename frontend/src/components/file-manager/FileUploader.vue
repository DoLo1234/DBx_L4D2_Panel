<template>
  <el-upload
    class="upload-demo"
    :auto-upload="false"
    :on-change="handleFileChange"
    :drag="!directory"
    multiple
    ref="uploadRef"
    :disabled="fileStore.uploading"
    :directory="directory"
    :show-file-list="false"
    :file-list="fileStore.uploadFiles"
  >
    <template #trigger v-loading="fileStore.uploading">
      <div class="upload-trigger" v-if="directory">
        <Icon class="el-icon--upload" icon="mdi:upload" />
        <div class="el-upload__text"><em>点击上传</em></div>
      </div>
      <Icon v-if="!directory" class="el-icon--upload" icon="mdi:upload" />
      <div v-if="!directory" class="el-upload__text">
        （支持拖拽上传）<em>点击上传</em>
      </div>
    </template>
    <template #tip>
      <div>
        {{
          directory
            ? "选择插件文件夹，上传前请确保插件文件夹结构正确"
            : "选择文件 (支持拖拽上传)"
        }}
      </div>
    </template>
  </el-upload>

  <!-- 自定义文件列表 -->
  <div class="custom-file-list" v-if="fileStore.uploadFiles.length > 0">
    <div
      v-for="file in fileStore.uploadFiles"
      :key="file.uid || file.name"
      class="file-item"
    >
      <div class="file-info">
        <div class="title-box">
          <span class="file-name">{{ file.name }}</span>
        </div>
        <el-progress
          v-if="getFileProgressInfo(file.uid || file.name)"
          :percentage="getFilePercentage(file.uid || file.name)"
          :stroke-width="8"
          :status="getFileProgressStatus(file)"
        />

        <div class="title-box">
          <span v-if="getFileStatus(file) === 'success'" class="file-success">
            <el-icon>
              <Icon icon="mdi:check-circle" />
            </el-icon>
            上传成功
          </span>
          <span v-if="getFileStatus(file) === 'ready'" class="file-ready">
            <el-icon>
              <Icon icon="mdi:check-circle" />
            </el-icon>
            待上传
          </span>
          <span
            v-if="getFileStatus(file) === 'uploading'"
            class="file-uploading"
          >
            <el-icon>
              <Icon icon="mdi:upload" />
            </el-icon>
            上传中
          </span>
          <span v-else-if="getFileStatus(file) === 'fail'" class="file-fail">
            <el-icon>
              <Icon icon="mdi:close-circle" />
            </el-icon>
            上传失败
          </span>
          <el-button
            type="danger"
            size="small"
            :disabled="fileStore.uploading"
            @click="deleteUploadFile(file)"
          >
            <Icon icon="mdi:delete" />
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { Icon } from "@iconify/vue";
import { useFileStore } from "@/stores/file";

const props = defineProps({
  /**
   * 是否为目录上传
   */
  directory: {
    type: Boolean,
    default: false,
    required: true,
  },
});
const emit = defineEmits(["handleFileChange"]);

// 直接使用 store
const fileStore = useFileStore();

const uploadRef = ref(null);

// 获取文件的上传进度
const getFilePercentage = (fileId) => {
  if (fileStore.fileProgressMap && fileStore.fileProgressMap[fileId]) {
    return fileStore.fileProgressMap[fileId].progress;
  }
  return 0;
};

// 获取文件进度信息
const getFileProgressInfo = (fileId) => {
  return fileStore.fileProgressMap[fileId] || {};
};

// 获取文件状态
const getFileStatus = (file) => {
  const fileId = file.uid || file.name;
  if (fileStore.fileProgressMap && fileStore.fileProgressMap[fileId]) {
    const progressInfo = fileStore.fileProgressMap[fileId];
    if (progressInfo.progress === 100) {
      return "success";
    } else if (progressInfo.status && progressInfo.status.includes("失败")) {
      return "fail";
    } else if (progressInfo.status || progressInfo.progress >= 0) {
      return "uploading";
    }
  }
  return file.status || "ready";
};

// 获取 el-progress 的状态
const getFileProgressStatus = (file) => {
  const status = getFileStatus(file);
  if (status === "success") return "success";
  if (status === "fail") return "exception";
  return undefined;
};

const handleFileChange = (file, files) => {
  fileStore.uploadFiles = files;
  emit("handleFileChange", file, files);
};

const deleteUploadFile = (file) => {
  fileStore.uploadFiles.splice(fileStore.uploadFiles.indexOf(file), 1);
  console.log(fileStore.uploadFiles);
};

// 清空文件列表
const clearFileList = () => {
  if (uploadRef.value) {
    uploadRef.value.clearFiles();
  }
  fileStore.uploadFiles = [];
};

// 暴露方法给父组件
defineExpose({
  clearFileList,
});
</script>

<style scoped lang="scss">
/* 上传组件样式 */
.upload-demo {
  width: 100%;
  :deep(.el-upload) {
    width: 100%;
  }
  :deep(.upload-trigger) {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: var(--el-upload-dragger-padding-vertical)
      var(--el-upload-dragger-padding-horizontal);
    border-radius: 8px;
    border: 1px dashed var(--el-border-color);
  }
}

/* 自定义文件列表样式 */
.custom-file-list {
  margin-top: 10px;
  max-height: 400px;
  overflow: auto;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

/* 文件项样式 */
.file-item {
  margin-bottom: 12px;
  padding: 12px;
  background-color: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  &:last-child {
    margin-bottom: 0;
  }
}

/* 文件信息样式 */
.file-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  .title-box {
    display: flex;
    align-items: center;
    gap: 8px;
    .el-button {
      margin-left: auto;
    }
  }
  :deep(.el-progress__text) {
    min-width: auto;
  }
}

/* 文件名样式 */
.file-name {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
  word-break: break-all;
}

/* 上传成功样式 */
.file-success {
  font-size: 13px;
  color: #67c23a;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 上传中样式 */
.file-uploading {
  font-size: 13px;
  color: #409eff;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 等待上传样式 */
.file-ready {
  font-size: 13px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 上传失败样式 */
.file-fail {
  font-size: 13px;
  color: #f56c6c;
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
