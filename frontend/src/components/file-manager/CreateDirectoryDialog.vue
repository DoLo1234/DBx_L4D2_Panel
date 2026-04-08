<template>
  <!-- 新增文件夹对话框 -->
  <el-dialog v-model="visible" title="新增文件夹" width="70%">
    <div>
      <el-form label-width="80px">
        <el-form-item label="文件夹名">
          <el-input
            v-model.tirm="localDirectoryName"
            placeholder="请输入文件夹名"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="保存位置">
          <el-input :value="currentPath" disabled style="width: 100%" />
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button type="primary" @click="handleSave">保存</el-button>
        <el-button @click="handleCancel">取消</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from "vue";
import { ElMessage } from "element-plus";
const props = defineProps({
  currentPath: {
    type: String,
    default: "",
  },
});

const visible = defineModel("visible");

const emit = defineEmits(["saveNewDirectory"]);

const localDirectoryName = defineModel("directoryName");

const handleCancel = () => {
  localDirectoryName.value = "";
  visible.value = false;
};

const handleSave = () => {
  if (!localDirectoryName.value) {
    ElMessage.error("请完善文件夹名");
    return;
  }
  emit("saveNewDirectory");
};
</script>

<style scoped lang="scss">
.dialog-footer {
  display: flex;
  justify-content: start;
  gap: 12px;
  padding: 15px 20px;
  border-top: 1px solid #ebeef5;
  background-color: #fafafa;
}
</style>
