<template>
  <div class="file-manager">
    <!-- 文件操作按钮 -->
    <FileActions
      v-if="showActions"
      :upload-title="uploadTitle"
      :selected-files="selectedFiles"
      v-model:search-keyword="searchKeyword"
      @upload-file="handleUploadFile"
      @create-item="handleCreateItem"
      @refresh="handleRefresh"
      @delete-file="handleDeleteFile"
      @edit-file="handleEditFile"
    />

    <!-- 目录导航 -->
    <BreadcrumbNavigator
      :current-path="currentPath"
      :initial-path="initialPath"
      :server-name="serverName"
      @navigate-to-root="navigateToRoot"
      @navigate-to-path="navigateToPath"
    />

    <!-- 文件列表 -->
    <div class="file-list-wrapper">
      <FileList
        :files="files"
        :filteredFiles="filteredFiles"
        :selectedFiles="selectedFiles"
        @toggleSelectFile="toggleSelectFile"
        @handleDoubleClick="handleDoubleClick"
      />
    </div>

    <!-- 上传文件对话框 -->
    <UploadDialog
      v-model:visible="showUploadDialog"
      :title="uploadTitle"
      :uploading="fileStore.uploading"
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
import { ref, computed, inject } from "vue";
import FileList from "./FileList.vue";
import FileActions from "./fileActions.vue";
import BreadcrumbNavigator from "./BreadcrumbNavigator.vue";
import UploadDialog from "./UploadDialog.vue";
import CreateItemDialog from "@/components/file-manager/CreateItemDialog.vue";
import FileDialog from "./FileDialog.vue";
import { useFileStore } from "@/stores/file";

// 注入 Swal 实例
const Swal = inject("$swal");

// 使用文件存储
const fileStore = useFileStore();

// Props
const props = defineProps({
  uploadTitle: {
    type: String,
    default: "上传文件",
  },
  initialPath: {
    type: String,
    default: "",
  },
  serverName: {
    type: String,
    default: "",
  },
  showActions: {
    type: Boolean,
    default: true,
  },
  /**
   * 是否上传文件夹
   */
  uploadType: {
    type: Boolean,
    default: false,
  },
  /**
   * 初始文件列表，避免重复加载
   */
  initialFiles: {
    type: Array,
    default: () => [],
  },
});

// Emits
const emit = defineEmits(["fileUpdated"]);

// 状态管理
const currentPath = ref(props.initialPath);
const files = ref(props.initialFiles);
const selectedFiles = ref([]);
const searchKeyword = ref("");
const showCreateFileDialog = ref(false);
const showCreateDirectoryDialog = ref(false);
const showCreateItemDialog = ref(false);
const showFileDialog = ref(false);
const activeTab = ref("preview");
const newFileName = ref("");
const newDirectoryName = ref("");
const currentFile = ref(null);

// 加载当前目录文件
const loadFiles = async () => {
  try {
    const fileList = await fileStore.getFileTree(currentPath.value);
    files.value = fileList;
    selectedFiles.value = [];
  } catch (error) {
    console.error("加载文件失败:", error);
  }
};

// 刷新文件列表
const handleRefresh = async () => {
  await loadFiles();
};

const handleCreateItem = () => {
  showCreateItemDialog.value = true;
};

// 过滤文件（搜索）
const filteredFiles = computed(() => {
  // 无搜索关键词时，按“文件夹优先”排序
  if (!searchKeyword.value) {
    return files.value.sort((a, b) => {
      if (a.type === "directory" && b.type !== "directory") return -1;
      if (a.type !== "directory" && b.type === "directory") return 1;
      return a.name.localeCompare(b.name);
    });
  }
  // 有搜索关键词时，先过滤再按“文件夹优先”排序
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

// 导航到根目录
const navigateToRoot = () => {
  currentPath.value = props.initialPath;
  loadFiles();
};

// 导航到指定路径
const navigateToPath = (path) => {
  currentPath.value = path;
  loadFiles();
};

// 处理双击文件/文件夹
const handleDoubleClick = (file) => {
  if (file.type === "directory") {
    if (currentPath.value) {
      // 确保使用统一的正斜杠分隔符
      currentPath.value = `${currentPath.value.replace(/\\/g, "/")}/${file.name}`;
    } else {
      currentPath.value = file.name;
    }
    loadFiles();
  } else {
    handleEditFile(file);
  }
};

// 切换文件选择状态
const toggleSelectFile = (file) => {
  const index = selectedFiles.value.findIndex((f) => f.path === file.path);
  if (index > -1) {
    selectedFiles.value.splice(index, 1);
  } else {
    selectedFiles.value.push(file);
  }
};
// 服务器相关

// 上传状态
const showUploadDialog = ref(false);

// 上传文件相关
const uploadFiles = ref([]);
// 处理上传文件
const handleUploadFile = () => {
  uploadFiles.value = [];
  showUploadDialog.value = true;
};

// 处理文件选择
const handleFileChange = (file, fileList) => {
  uploadFiles.value = fileList;
};

// 提交上传
const submitUpload = async () => {
  if (uploadFiles.value.length === 0) return;

  try {
    // 为每个文件添加相对路径信息
    const filesWithPath = uploadFiles.value.map((file) => {
      const relativePath = getRelativePath(file.raw);
      return {
        ...file,
        relativePath,
      };
    });
    // console.log("上传文件:", filesWithPath);
    await fileStore.submitUpload(filesWithPath, currentPath.value, async () => {
      // 清空上传文件列表
      uploadFiles.value = [];
      // 再关闭对话框
      // showUploadDialog.value = false;
      // 等待文件上传完成
      await new Promise((resolve) => setTimeout(resolve, 1000));
      loadFiles();
      await Swal.fire({
        title: "成功",
        text: "文件上传成功",
        icon: "success",
        confirmButtonText: "确定",
      });
      emit("fileUpdated");
    });
  } catch (error) {
    console.error("上传文件失败:", error);
    // 清空上传文件列表
    uploadFiles.value = [];
  }
};

// 获取文件的相对路径（用于保留文件夹结构）
const getRelativePath = (file) => {
  // 如果是文件夹上传且文件有 webkitRelativePath 属性
  if (props.uploadType && file.webkitRelativePath) {
    // 提取文件夹路径（去掉文件名）
    const pathParts = file.webkitRelativePath.split("/");
    if (pathParts.length > 1) {
      // 移除最后一个元素（文件名），剩下的就是文件夹路径
      pathParts.pop();
      return pathParts.join("/");
    }
  }
  return "";
};

// 处理上传错误（保留兼容旧的el-upload）
const handleUploadError = () => {
  Swal.fire({
    title: "错误",
    text: "文件上传失败",
    icon: "error",
    confirmButtonText: "确定",
  });
};

// 处理新增文件
const handleCreateFile = () => {
  showCreateFileDialog.value = true;
};

// 取消新增文件
const cancelCreateFile = () => {
  showCreateFileDialog.value = false;
  newFileName.value = "";
};

// 处理新增文件夹
const handleCreateDirectory = () => {
  showCreateDirectoryDialog.value = true;
};

// 取消新增文件夹
const cancelCreateDirectory = () => {
  showCreateDirectoryDialog.value = false;
  newDirectoryName.value = "";
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

// 处理删除文件
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
      emit("fileUpdated");
    }
  } catch (error) {
    console.error("删除文件失败:", error);
  }
};

// 处理编辑文件
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

// 保存文件修改
const saveFileChanges = async () => {
  if (!currentFile.value) return;

  try {
    console.log(
      "保存文件修改: ",
      currentFile.value.path,
      currentFile.value.content,
    );
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
    emit("fileUpdated");
  } catch (error) {
    console.error("保存文件修改失败:", error);
  }
};
</script>

<style scoped lang="scss">
.file-manager {
  width: 100%;
  height: auto;
  font-size: 0.8rem;
  position: relative;
}

.file-list-wrapper {
  flex: 1;
  min-height: 0;
}
</style>
