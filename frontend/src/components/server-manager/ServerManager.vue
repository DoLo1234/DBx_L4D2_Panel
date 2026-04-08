<template>
  <div class="server-manager">
    <!-- 服务器选择和操作按钮 -->
    <div v-if="showActions" class="server-selection-container">
      <!-- 服务器选择和操作按钮折叠面板 -->
      <el-collapse v-model="activeCollapse" class="actions-collapse">
        <el-collapse-item name="1">
          <template #title>
            <div class="collapse-title">
              <el-form
                :model="serverForm"
                label-width="auto"
                class="server-selection-form"
              >
                <el-form-item label="服务器" prop="serverId" @click.stop>
                  <el-select
                    v-model="serverForm.serverId"
                    placeholder="请选择服务器"
                    class="server-select"
                    :class="{ 'mobile-select': isMobile }"
                    @change="handleServerChange"
                  >
                    <el-option
                      v-for="server in servers"
                      :key="server.name"
                      :label="server.name"
                      :value="server.name"
                    />
                    <template #empty>
                      <div class="empty-server">请先部署服务器</div>
                    </template>
                  </el-select>
                </el-form-item>
                <el-tag
                  v-if="currentServer"
                  :type="getServerTagInfo(currentServer).type"
                >
                  {{ getServerTagInfo(currentServer).text }}
                </el-tag>
                <el-button
                  v-if="
                    currentServer && currentServer.name.match(/^server\d+$/)
                  "
                  @click.stop="showDeployToDirectoryDialog(currentServer.name)"
                >
                  {{ currentServer.isServer ? "更新" : "部署" }}
                </el-button>
                <el-button
                  v-if="
                    currentServer &&
                    currentServer.name.match(/^server\d+$/) &&
                    currentServer.isServer
                  "
                  @click.stop="navigateToPlugins(currentServer.name)"
                >
                  插件
                </el-button>
              </el-form>
            </div>
          </template>
          <!-- 操作按钮区域 -->
          <FileActions
            :upload-title="uploadTitle"
            :selected-files="selectedFiles"
            v-model:search-keyword="searchKeyword"
            @upload-file="handleUploadFile"
            @create-item="handleCreateItem"
            @refresh="handleRefresh"
            @delete-file="handleDeleteFile"
            @edit-file="handleEditFile"
          />
        </el-collapse-item>
      </el-collapse>
    </div>

    <!-- 目录导航 -->
    <BreadcrumbNavigator
      class="breadcrumb-navigator"
      :current-path="currentPath"
      :initial-path="initialPath"
      :server-name="serverName"
      @navigate-to-root="navigateToRoot"
      @navigate-to-path="navigateToPath"
    />

    <!-- 文件列表 -->
    <div class="file-list-wrapper">
      <FileList
        :filteredFiles="filteredFiles"
        :selected-files="selectedFiles"
        @toggleSelectFile="toggleSelectFile"
        @handleDoubleClick="handleDoubleClick"
      />
    </div>

    <!-- 上传文件对话框 -->
    <UploadDialog
      v-model:visible="showUploadDialog"
      :title="uploadTitle"
      :uploading="fileStore.uploading"
      :upload-progress="fileStore.uploadProgress"
      :upload-status="fileStore.uploadStatus"
      :directory="uploadType"
      @handleFileChange="handleFileChange"
      @submitUpload="submitUpload"
    />

    <!-- 新增文件/文件夹对话框 -->
    <CreateItemDialog
      v-model:visible="showCreateItemDialog"
      :currentPath="currentPath"
      @saveNewFile="saveNewFile"
      @saveNewDirectory="saveNewDirectory"
    />

    <!-- 文件预览和编辑对话框 -->
    <FileDialog
      v-model:visible="showFileDialog"
      v-model:currentFile="currentFile"
      v-model:activeTab="activeTab"
      @saveFileChanges="saveFileChanges"
    />
  </div>
</template>

<script setup>
import { ref, computed, inject, watch } from "vue";
import FileList from "@/components/file-manager/FileList.vue";
import FileActions from "@/components/file-manager/FileActions.vue";
import BreadcrumbNavigator from "@/components/file-manager/BreadcrumbNavigator.vue";
import UploadDialog from "@/components/file-manager/UploadDialog.vue";
import CreateItemDialog from "@/components/file-manager/CreateItemDialog.vue";
import FileDialog from "@/components/file-manager/FileDialog.vue";
import { fileApi } from "@/api";
import { useFileStore } from "@/stores/file";

const Swal = inject("$swal");
const isMobile = inject("isMobile");

// 使用文件存储
const fileStore = useFileStore();
const props = defineProps({
  uploadTitle: { type: String, default: "上传文件" },
  initialPath: { type: String, default: "" },
  serverName: { type: String, default: "" },
  showActions: { type: Boolean, default: true },
  uploadType: { type: Boolean, default: false },
  initialFiles: { type: Array, default: () => [] },
  servers: { type: Array, default: () => [] },
  currentServer: { type: Object, default: null },
});

const emit = defineEmits([
  "serverChange",
  "deployToDirectory",
  "navigateToPlugins",
]);

const currentPath = ref(props.initialPath);
const files = ref(props.initialFiles);
const selectedFiles = ref([]);
const searchKeyword = ref("");
const showCreateItemDialog = ref(false);
const showFileDialog = ref(false);
const activeTab = ref("preview");
const currentFile = ref(null);

const serverForm = ref({
  serverId: props.serverName || "",
});

const activeCollapse = ref([""]);

const showUploadDialog = ref(false);

const filteredFiles = computed(() => {
  if (!searchKeyword.value) {
    return files.value.sort((a, b) => {
      if (a.type === "directory" && b.type !== "directory") return -1;
      if (a.type !== "directory" && b.type === "directory") return 1;
      return a.name.localeCompare(b.name);
    });
  }
  return files.value
    .filter((file) =>
      file.name.toLowerCase().includes(searchKeyword.value.toLowerCase()),
    )
    .sort((a, b) => {
      if (a.type === "directory" && b.type !== "directory") return -1;
      if (a.type !== "directory" && b.type === "directory") return 1;
      return a.name.localeCompare(b.name);
    });
});

const loadFiles = async () => {
  try {
    const fileList = await fileStore.getFileTree(currentPath.value);
    files.value = fileList;
    selectedFiles.value = [];
  } catch (error) {
    console.error("加载文件失败:", error);
    Swal.fire({
      title: "错误",
      text: "加载文件失败",
      icon: "error",
      confirmButtonText: "确定",
    });
  }
};

const handleRefresh = async () => {
  await loadFiles();
};

const navigateToRoot = () => {
  currentPath.value = props.initialPath;
  loadFiles();
};

const navigateToPath = (path) => {
  currentPath.value = path;
  loadFiles();
};

const handleDoubleClick = (file) => {
  if (file.type === "directory") {
    if (currentPath.value) {
      currentPath.value = `${currentPath.value.replace(/\\/g, "/")}/${file.name}`;
    } else {
      currentPath.value = file.name;
    }
    loadFiles();
  } else {
    handleEditFile(file);
  }
};

const toggleSelectFile = (file) => {
  const index = selectedFiles.value.findIndex((f) => f.path === file.path);
  if (index > -1) {
    selectedFiles.value.splice(index, 1);
  } else {
    selectedFiles.value.push(file);
  }
};

const handleServerChange = (serverId) => {
  emit("serverChange", serverId);
};

const handleUploadFile = () => {
  showUploadDialog.value = true;
};

const handleFileChange = (file, fileList) => {
  fileStore.uploadFiles = fileList;
};

const submitUpload = async () => {
  if (fileStore.uploadFiles.length === 0) return;

  try {
    // 为每个文件添加相对路径信息
    const filesWithPath = fileStore.uploadFiles.map((file) => {
      // 提取文件的相对路径（用于保留文件夹结构）
      let relativePath = "";
      if (props.uploadType && file.raw.webkitRelativePath) {
        const pathParts = file.raw.webkitRelativePath.split("/");
        if (pathParts.length > 1) {
          pathParts.pop();
          relativePath = pathParts.join("/");
        }
      }
      return {
        ...file,
        relativePath,
      };
    });

    await fileStore.submitUpload(filesWithPath, currentPath.value, async () => {
      const result = await Swal.fire({
        title: "成功",
        text: "文件上传成功",
        icon: "success",
        confirmButtonText: "确定",
      });
      if (!result.isConfirmed) return;
      fileStore.uploadFiles = [];
      // showUploadDialog.value = false;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      loadFiles();
    });
  } catch (error) {
    console.error("上传文件失败:", error);
  }
};

const handleCreateItem = () => {
  showCreateItemDialog.value = true;
};

const saveNewFile = async (fileName) => {
  if (!fileName) return;

  try {
    const success = await fileStore.saveNewFile(
      fileName,
      currentPath.value,
      files.value,
    );

    if (!success) {
      Swal.fire({
        title: "错误",
        text: "文件名已存在",
        icon: "error",
      });
      return;
    }

    Swal.fire({
      title: "成功",
      text: "文件创建成功",
      icon: "success",
      confirmButtonText: "确定",
    });
    loadFiles();
  } catch (error) {
    console.error("创建文件失败:", error);
  }
};

const saveNewDirectory = async (directoryName) => {
  if (!directoryName) return;

  try {
    const success = await fileStore.saveNewDirectory(
      directoryName,
      currentPath.value,
      files.value,
    );

    if (!success) {
      Swal.fire({
        title: "错误",
        text: "文件夹名已存在",
        icon: "error",
      });
      return;
    }

    Swal.fire({
      title: "成功",
      text: "文件夹创建成功",
      icon: "success",
      confirmButtonText: "确定",
    });
    loadFiles();
  } catch (error) {
    console.error("创建文件夹失败:", error);
  }
};

const handleDeleteFile = async () => {
  if (selectedFiles.value.length === 0) return;
  try {
    const fileNames = selectedFiles.value.map((file) => file.name).join("、");
    const result = await Swal.fire({
      title: "确认删除",
      text: `确定要删除 ${fileNames} 吗？`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "删除",
      cancelButtonText: "取消",
    });
    if (result.isConfirmed) {
      await fileStore.deleteFiles(selectedFiles.value);

      Swal.fire({
        title: "成功",
        text: "文件删除成功",
        icon: "success",
        confirmButtonText: "确定",
      });
      selectedFiles.value = [];
      loadFiles();
    }
  } catch (error) {
    console.error("删除文件失败:", error);
  }
};

const handleEditFile = async (file) => {
  const targetFile = file || selectedFiles.value[0];
  if (!targetFile || targetFile.type !== "file") return;
  // 确保文件类型是可编辑预览的文件
  if (!fileStore.isEditableFile(targetFile.name)) {
    Swal.fire({
      title: "错误",
      text: "该文件类型不支持编辑预览",
      icon: "error",
    });
    return;
  }
  try {
    const { content } = await fileStore.getFileContent(targetFile.path);
    currentFile.value = {
      ...targetFile,
      content: content || "",
    };
    showFileDialog.value = true;
  } catch (error) {
    console.error("获取文件内容失败:", error);
  }
};

const saveFileChanges = async () => {
  if (!currentFile.value) return;
  try {
    await fileStore.saveFileContent(
      currentFile.value.path,
      currentFile.value.content,
    );

    Swal.fire({
      title: "成功",
      text: "文件修改已保存",
      icon: "success",
      confirmButtonText: "确定",
    });
    showFileDialog.value = false;
    loadFiles();
  } catch (error) {
    console.error("保存文件修改失败:", error);
  }
};

const showDeployToDirectoryDialog = (directoryName) => {
  emit("deployToDirectory", directoryName);
};

const navigateToPlugins = (serverName) => {
  emit("navigateToPlugins", serverName);
};

const getServerTagInfo = (server) => {
  if (!server) {
    return { type: "info", text: "未选择" };
  }
  if (server.isServer) {
    return { type: "success", text: "已部署" };
  } else {
    return { type: "info", text: "未部署" };
  }
};

watch(
  () => props.currentServer,
  (newServer) => {
    if (newServer) {
      if (newServer.name !== serverForm.value.serverId) {
        serverForm.value.serverId = newServer.name;
      }
      currentPath.value = newServer.path || "";
      files.value = newServer.files ? [...newServer.files] : [];
    }
  },
  { deep: true },
);

// 完全移除初始加载逻辑，因为文件加载应该由父组件（ServerManagementView）控制
// 父组件会在服务器列表加载完成后加载第一个服务器的文件，避免重复请求
</script>

<style scoped lang="scss">
.server-manager {
  width: 100%;
  height: auto;
  font-size: 0.8rem;
  position: relative;
}

.server-selection-container {
  background-color: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  position: sticky;
  top: 39px;
  z-index: 100;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  .el-collapse {
    border-top: none !important;
    border-bottom: none !important;
    :deep(.el-collapse-item__header) {
      padding: 5px 10px;
      background-color: transparent !important;
      border-bottom: none !important;
    }
    :deep(.el-collapse-item__wrap) {
      // padding: 10px;
      border-bottom: none !important;
      background-color: transparent !important;
      .el-collapse-item__content {
        padding: 10px;
      }
    }
  }
}

.breadcrumb-navigator {
  position: sticky;
  top: 91px;
  z-index: 90;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.collapse-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  .server-selection-form {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
    margin: 0;
    .el-button {
      margin-left: 0;
    }
    .el-form-item {
      margin-bottom: 0;
    }
    .server-select {
      width: 200px;
      &.mobile-select {
        width: 100px;
      }
    }
  }
}

.actions-collapse {
  .el-collapse-item__content {
    padding: 12px 0 0 0;
  }
}

.file-list-wrapper {
  min-height: 0;
}
</style>
