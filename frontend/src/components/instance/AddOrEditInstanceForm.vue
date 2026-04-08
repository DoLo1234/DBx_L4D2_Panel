<template>
  <InstanceFormContent
    :deployed-servers="deployedServers"
    :existing-instances="existingInstances"
    :form-data="formData"
    :is-edit="isEdit"
    :submit-text="submitText"
    @save="handleSave"
    @cancel="handleCancel"
  />
</template>

<script setup>
import InstanceFormContent from "@/components/instance/InstanceFormContent.vue";

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
  formData: {
    type: Object,
    default: () => {},
  },
  isEdit: {
    type: Boolean,
    default: false,
  },
  submitText: {
    type: String,
    default: "保存",
  },
});

// Emits
const emit = defineEmits(["save", "cancel"]);

// 处理保存事件
const handleSave = (formData) => {
  emit("save", formData);
};

// 处理取消事件
const handleCancel = () => {
  emit("cancel");
};
</script>

<style scoped lang="scss">
/* 组件样式 */
</style>
