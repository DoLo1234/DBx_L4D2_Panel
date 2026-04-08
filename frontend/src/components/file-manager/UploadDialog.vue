<template>
  <!-- 上传文件对话框 -->
  <el-dialog
    v-model="visible"
    :title="$attrs.title"
    width="80%"
    top="10vh"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <FileUploader
      ref="fileUploaderRef"
      :directory="directory"
      @handleFileChange="handleFileChange"
    />

    <template #footer>
      <span class="dialog-footer">
        <el-button type="primary" @click="handleSubmit" :loading="uploading">
          {{ uploading ? "上传中..." : "上传" }}
        </el-button>
        <el-button @click="handleCancel" :disabled="uploading">取消</el-button>
        <el-button type="danger" @click="clearFileList" :disabled="uploading">
          清空
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import FileUploader from "./FileUploader.vue";
import { ref } from "vue";

const props = defineProps({
  /**
   * 是否正在上传
   */
  uploading: {
    type: Boolean,
    default: false,
  },
  /**
   * 是否为目录上传
   */
  directory: {
    type: Boolean,
    default: false,
    required: true,
  },
});

const fileList = defineModel({
  type: Array,
  default: () => [],
});

const visible = defineModel("visible");

const emit = defineEmits(["handleFileChange", "submitUpload"]);

const fileUploaderRef = ref(null);
const handleFileChange = (file, fileList) => {
  emit("handleFileChange", file, fileList);
};

const handleSubmit = () => {
  emit("submitUpload");
};

const handleCancel = () => {
  clearFileList();
  visible.value = false;
};

// 清空文件列表
const clearFileList = () => {
  if (fileUploaderRef.value) {
    fileUploaderRef.value.clearFileList();
    // console.log("清空文件列表", fileUploaderRef.value);
  }
};

defineExpose({
  clearFileList,
});
</script>

<style scoped lang="scss">
.dialog-footer {
  display: flex;
  justify-content: start;
  gap: 5px;
  padding: 15px 20px;
  border-top: 1px solid #ebeef5;
  background-color: #fafafa;
}
</style>
