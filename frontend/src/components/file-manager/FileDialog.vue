<template>
  <!-- 文件预览和编辑对话框 -->
  <el-dialog
    v-model="visible"
    :fullscreen="isMobile"
    :title="currentFile ? `${currentFile.name} - 文件预览/编辑` : '文件操作'"
    width="70%"
    top="5vh"
  >
    <template v-if="currentFile">
      <div class="file-info">
        <p>
          大小: {{ formatFileSize(currentFile.size || 0) }} | 路径:
          {{ currentFile.path }}
        </p>
      </div>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="预览" name="preview">
          <div class="file-preview">
            <pre>{{ formattedContent }}</pre>
          </div>
        </el-tab-pane>
        <el-tab-pane label="编辑" name="edit">
          <el-input
            type="textarea"
            :rows="18"
            v-model="fileContent"
            placeholder="请编辑文件内容"
            resize="none"
            class="file-editor"
          />
        </el-tab-pane>
      </el-tabs>
    </template>
    <template #footer>
      <span class="dialog-footer">
        <el-button
          type="primary"
          :disabled="activeTab === 'preview'"
          @click="handleSave"
          v-if="currentFile"
        >
          保存修改
        </el-button>
        <el-button @click="handleCancel">取消</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, inject, computed } from "vue";
const isMobile = ref(inject("isMobile"));
const visible = defineModel("visible", {
  type: Boolean,
  default: false,
});
const currentFile = defineModel("currentFile", {
  type: Object,
  default: null,
});
const activeTab = defineModel("activeTab", {
  type: String,
  default: "preview",
});

const emit = defineEmits(["saveFileChanges"]);

// 监听fileContent变化，更新currentFile
const fileContent = computed({
  get: () => formattedContent.value || "",
  set: (newContent) => {
    if (currentFile.value) {
      currentFile.value = {
        ...currentFile.value,
        content: newContent,
      };
    }
  },
});

const handleCancel = () => {
  visible.value = false;
};

const handleSave = () => {
  emit("saveFileChanges");
};

// 计算属性：格式化后的文件内容
const formattedContent = computed(() => {
  const text = currentFile.value?.content || "";
  if (!text) return "";

  // 分割文本为行
  const lines = text.split("\n");

  // 检测缩进字符（空格或制表符）
  let indentChar = " ";
  let indentSize = 2;

  // 查找第一个非空行，检测缩进
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine) {
      const indentMatch = line.match(/^(\s+)/);
      if (indentMatch) {
        const indent = indentMatch[1];
        if (indent.includes("\t")) {
          indentChar = "\t";
          indentSize = 1;
        } else {
          indentChar = " ";
          indentSize = indent.length;
        }
      }
      break;
    }
  }

  // 统一缩进
  return lines
    .map((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return "";

      // 计算原始缩进级别
      const indentMatch = line.match(/^(\s+)/);
      const originalIndent = indentMatch ? indentMatch[1].length : 0;
      const indentLevel = Math.floor(originalIndent / indentSize);

      // 应用统一缩进
      return indentChar.repeat(indentLevel * 2) + trimmedLine;
    })
    .join("\n");
});

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
.file-info p {
  margin-top: 10px;
  color: #999;
  // 支持换行显示
  white-space: pre-wrap;
  word-wrap: break-word;
}

.file-preview {
  max-height: 50vh;
  overflow: auto;
  background-color: #f5f7fa;
  padding: 11px 5px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.file-preview pre {
  margin: 0;
  font-family: "Courier New", Courier, monospace;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 14px;
  line-height: 1.6;
}

.file-editor {
  border: 1px solid #ebeef5;
  border-radius: 12px;
  font-family: "Courier New", Courier, monospace;
  font-size: 14px;
  line-height: 1.6;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 15px 20px;
  border-top: 1px solid #ebeef5;
  background-color: #fafafa;
}
</style>
