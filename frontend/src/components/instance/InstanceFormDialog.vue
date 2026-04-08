<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? '编辑服务器实例' : '添加服务器实例'"
    width="70%"
    :fullscreen="isMobile"
    :show-close="false"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <!-- 使用通用的表单组件 -->
    <AddOrEditInstanceForm
      :deployed-servers="deployedServers"
      :existing-instances="existingInstances"
      :form-data="formData"
      :is-edit="isEdit"
      :submit-text="isEdit ? '保存修改' : '添加实例'"
      @save="handleSave"
      @cancel="handleCancel"
    />
  </el-dialog>
</template>

<script setup>
import { ref, inject } from "vue";
import AddOrEditInstanceForm from "./AddOrEditInstanceForm.vue";

// 使用 defineModel 处理弹窗的显示和隐藏
const dialogVisible = defineModel({
  default: false,
});

const formData = defineModel("formData", {
  default: () => {},
});

const isEdit = defineModel("isEdit", {
  default: false,
});

// Props
const props = defineProps({
  deployedServers: {
    type: Array,
    default: () => [],
  },
  existingInstances: {
    type: Array,
    default: () => [],
  },
});

// Emits
const emit = defineEmits(["save", "cancel"]);

const isMobile = ref(inject("isMobile"));

// 处理保存事件
const handleSave = (formData) => {
  // 触发保存事件，传递表单数据
  emit("save", formData);
  // 操作成功后关闭弹窗
  dialogVisible.value = false;
};

// 处理取消事件
const handleCancel = () => {
  emit("cancel");
};
</script>

<style scoped lang="scss">
/* 容器样式 */
</style>
