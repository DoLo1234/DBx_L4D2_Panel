<template>
  <!-- 新增文件/文件夹对话框 -->
  <el-dialog v-model="visible" :title="title" width="70%">
    <div>
      <el-tabs v-model="activeTab" type="card">
        <el-tab-pane label="新建文件" name="file">
          <el-form label-width="80px">
            <el-form-item label="文件名">
              <el-input
                v-model.trim="fileName"
                placeholder="请输入文件名"
                style="width: 100%"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="新建文件夹" name="directory">
          <el-form label-width="80px">
            <el-form-item label="文件夹名">
              <el-input
                v-model.trim="directoryName"
                placeholder="请输入文件夹名"
                style="width: 100%"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
      <el-form label-width="80px" style="margin-top: 20px;">
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
import { ref } from "vue";
import { ElMessage } from "element-plus";

const props = defineProps({
  currentPath: {
    type: String,
    default: "",
  },
});

const visible = defineModel("visible");
const emit = defineEmits(["saveNewFile", "saveNewDirectory"]);

const activeTab = ref("file");
const fileName = ref("");
const directoryName = ref("");

const title = ref("新增");

const handleCancel = () => {
  fileName.value = "";
  directoryName.value = "";
  activeTab.value = "file";
  visible.value = false;
};

const handleSave = () => {
  if (activeTab.value === "file") {
    if (!fileName.value) {
      ElMessage.error("请完善文件名");
      return;
    }
    emit("saveNewFile", fileName.value);
  } else {
    if (!directoryName.value) {
      ElMessage.error("请完善文件夹名");
      return;
    }
    emit("saveNewDirectory", directoryName.value);
  }
  handleCancel();
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