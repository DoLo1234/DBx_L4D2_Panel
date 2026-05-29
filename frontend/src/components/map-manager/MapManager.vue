<template>
  <div class="file-manager" v-loading="loading" loading-text="加载中...">
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
                    @change="handleServerChange"
                  >
                    <el-option
                      v-for="server in deployedServers"
                      :key="server.name"
                      :label="server.name"
                      :value="server.name"
                    />
                    <template #empty>
                      <div class="empty-server">请先部署服务器</div>
                    </template>
                  </el-select>
                </el-form-item>
              </el-form>
            </div>
          </template>
          <!-- 操作按钮区域 -->
          <MapActions
            :upload-title="uploadTitle"
            :selected-files="selectedFiles"
            v-model:search-keyword="searchKeyword"
            @upload-file="handleUploadFile"
            @map-assign="handleMapAssign"
            @map-unassign="unassignMap"
            @refresh="handleRefresh"
            @delete-file="handleDeleteFile"
            @extract-map="handleExtractMap"
          />
        </el-collapse-item>
      </el-collapse>
    </div>

    <!-- 目录导航 -->
    <!-- <BreadcrumbNavigator
      :current-path="currentPath"
      :initial-path="initialPath"
      :server-name="serverName"
      @navigate-to-root="navigateToRoot"
      @navigate-to-path="navigateToPath"
    /> -->

    <!-- 文件列表 -->
    <div class="file-list-wrapper">
      <FileList
        :filteredFiles="filteredFiles"
        :selectedFiles="selectedFiles"
        :assignedMaps="mapStore.assignedMaps"
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

    <!-- 地图分配对话框 -->
    <MapAssignmentDialog
      v-model="showMapAssignmentDialog"
      :map-info="mapInfo"
      :serverName="serverForm.serverId"
      :loading="loading"
      @assignMap="assignMap"
    />
  </div>
</template>

<script setup>
import { ref, computed, inject, watch, reactive, toRaw } from "vue";
import FileList from "@/components/file-manager/FileList.vue";
import MapActions from "@/components/map-manager/MapActions.vue";
// import BreadcrumbNavigator from "@/components/file-manager/BreadcrumbNavigator.vue";
import UploadDialog from "@/components/file-manager/UploadDialog.vue";
import MapAssignmentDialog from "@/components/map-manager/MapAssignmentDialog.vue";
import { useFileStore } from "@/stores/file";
import { useMapStore } from "@/stores/map";

// 注入 Swal 实例
const Swal = inject("$swal");

// 使用文件存储
const fileStore = useFileStore();
const mapStore = useMapStore();
// Props
const props = defineProps({
  uploadTitle: {
    type: String,
    default: "上传",
  },
  initialPath: {
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
});

// Emits
const emit = defineEmits(["fileUpdated", "activeServerName"]);

// 状态管理
const currentPath = ref(props.initialPath);
const files = defineModel({
  type: Array,
  default: () => [],
});
const selectedFiles = ref([]);
const searchKeyword = ref("");
const mapInfo = ref([]);
const loading = ref(false);

// 服务器选择表单
const serverForm = reactive({
  serverId: "",
});

// 折叠面板状态
const activeCollapse = ref([""]);

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

const handleServerChange = (serverName) => {
  // 发送服务器名称给父组件
  emit("activeServerName", serverName);
};

// 刷新文件列表
const handleRefresh = async () => {
  await loadFiles();
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
// 处理双击文件/文件夹
const handleDoubleClick = (file) => {
  if (file.type !== "directory") return;
  if (currentPath.value) {
    // 确保使用统一的正斜杠分隔符
    currentPath.value = `${currentPath.value.replace(/\\/g, "/")}/${file.name}`;
  } else {
    currentPath.value = file.name;
  }
  loadFiles();
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
// 处理上传文件
const handleUploadFile = () => {
  fileStore.uploadFiles = [];
  showUploadDialog.value = true;
};

// 处理文件选择
const handleFileChange = (file, fileList) => {
  fileStore.uploadFiles = fileList;
};

// 提交上传
const submitUpload = async () => {
  if (fileStore.uploadFiles.length === 0) return;

  try {
    await fileStore.submitUpload(
      fileStore.uploadFiles,
      currentPath.value,
      async () => {
        Swal.fire({
          title: "成功",
          text: "文件上传成功",
          icon: "success",
          confirmButtonText: "确定",
        });
        // 清空上传文件列表
        // fileStore.uploadFiles = [];
        // 等待文件上传完成
        await new Promise((resolve) => setTimeout(resolve, 1000));
        loadFiles();
        emit("fileUpdated");
      },
      () => {
        // Swal.fire({
        //   title: "错误",
        //   text: "文件上传失败",
        //   icon: "error",
        //   confirmButtonText: "确定",
        // });
      },
    );
  } catch (error) {
    console.error("上传文件失败:", error);
  }
};

// 处理分配地图
const handleMapAssign = () => {
  // 如果没有服务器名称，则提示选择服务器
  // console.log("deployedServers:", deployedServers.value);
  if (!deployedServers.value.length) {
    Swal.fire({
      title: "分配地图提示",
      text: "请先部署服务器",
      icon: "warning",
      confirmButtonText: "确定",
    });
    return;
  }
  // 确保选择了地图文件
  if (selectedFiles.value.length === 0) {
    Swal.fire({
      title: "分配地图提示",
      text: "请先选择一个或多个地图文件",
      icon: "info",
      confirmButtonText: "确定",
    });
    return;
  }

  // 设置当前选中的地图信息
  mapInfo.value = selectedFiles.value;
  showMapAssignmentDialog.value = true;
};

// 处理删除文件
const handleDeleteFile = async () => {
  if (selectedFiles.value.length === 0) {
    Swal.fire({
      title: "提示",
      text: "请先选择一个或多个地图文件",
      icon: "info",
      confirmButtonText: "确定",
    });
    return;
  }

  // 根据已选的文件，筛选出所有已分配的文件
  const assignedFiles = toRaw(mapStore.assignedMaps).filter((map) =>
    selectedFiles.value.find((file) => file.name === map.mapName),
  );

  if (assignedFiles.length > 0) {
    Swal.fire({
      title: "提示",
      html: `已分配的地图文件不能删除：<br/>${assignedFiles.map((f) => `<span style="color: red;">${f.mapName}</span>`).join("<br/>")}`,
      icon: "warning",
      confirmButtonText: "确定",
    });
    return;
  }

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
      initialize();
      // emit("fileUpdated");
      emit("activeServerName", serverForm.serverId);
    }
  } catch (error) {
    console.error("删除文件失败:", error);
  }
};

// 处理提取地图
const handleExtractMap = async (file) => {
  console.log("file:", file);
  if (!file.length || !file.every((f) => f.type === "file")) return;
  try {
    // 确认是否解压
    const result = await Swal.fire({
      title: "确认解压",
      text: `确定要解压地图 ${file.map((f) => f.name).join("、")} 吗？`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "解压",
      cancelButtonText: "取消",
      input: "checkbox",
      inputLabel: "解压后删除源文件",
      inputValue: "deleteSource",
      inputPlaceholder: "选择后，解压完成将自动删除原始压缩文件",
    });

    if (!result.isConfirmed) return;
    loading.value = true;
    // 使用map store解压地图
    const { successFiles, failedFiles } = await mapStore.extractMaps(
      file,
      result.value,
    );

    // 显示结果
    if (successFiles.length > 0) {
      Swal.fire({
        title: "成功",
        text: `成功解压地图: ${successFiles.join("、")}`,
        icon: "success",
        confirmButtonText: "确定",
      });
    }

    if (failedFiles.length > 0) {
      const errorMessages = failedFiles
        .map((f) => `${f.name}: ${f.message}`)
        .join("\n");
      Swal.fire({
        title: "部分失败",
        text: `以下地图解压失败:\n${errorMessages}`,
        icon: "warning",
        confirmButtonText: "确定",
      });
    }

    // 刷新文件列表
    initialize();
    emit("activeServerName", serverForm.serverId);
  } catch (error) {
    console.error("解压地图失败:", error);
  } finally {
    loading.value = false;
  }
};

import { useInstanceStore } from "@/stores/instance";
const instanceStore = useInstanceStore();
const deployedServers = computed(() => instanceStore.deployedServers);

// 初始化加载文件和服务器列表
const initialize = async () => {
  await loadFiles();
};

// 执行初始化
initialize();

// 监听服务器列表变化，默认选择第一个服务器
watch(
  deployedServers,
  (newServers) => {
    // 如果没有服务器，则不执行操作
    if (newServers.length === 0) return;
    serverForm.serverId = newServers[0].name;
    emit("activeServerName", serverForm.serverId);
  },
  { immediate: true },
);

// 地图分配相关
const showMapAssignmentDialog = ref(false);

// 分配地图
const assignMap = async (mapInfo) => {
  try {
    // 这里可以添加实际的地图分配API调用
    const question = await Swal.fire({
      title: "确认分配",
      text: `确定要分配 ${mapInfo.mapInfo.length} 个地图到服务器 ${serverForm.serverId} 吗？`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "分配",
      cancelButtonText: "取消",
    });
    if (!question.isConfirmed) return;
    loading.value = true;

    await mapStore.assignMap(mapInfo.mapInfo, serverForm.serverId);

    const mapCount = mapInfo.mapInfo.length;
    Swal.fire({
      title: "成功",
      text: `成功分配 ${mapCount} 个地图到服务器 ${serverForm.serverId}`,
      icon: "success",
      confirmButtonText: "确定",
    });

    showMapAssignmentDialog.value = false;
    selectedFiles.value = [];
    emit("activeServerName", serverForm.serverId);
  } catch (error) {
    // console.error("分配地图失败:", error);
  } finally {
    loading.value = false;
  }
};

// 取消分配地图
const unassignMap = async () => {
  if (!deployedServers.value.length) {
    Swal.fire({
      title: "取消分配地图提示",
      text: "请先部署服务器",
      icon: "warning",
      confirmButtonText: "确定",
    });
    return;
  }
  // 确保选择了地图文件
  if (selectedFiles.value.length === 0) {
    Swal.fire({
      title: "取消分配地图提示",
      text: "请先选择一个或多个地图文件",
      icon: "info",
      confirmButtonText: "确定",
    });
    return;
  }
  try {
    // 根据当前选中的服务器，筛选出所有已分配的文件名
    const maps = toRaw(mapStore.assignedMaps).filter(
      (map) => map.serverName === serverForm.serverId,
    );
    if (maps.length === 0) {
      await Swal.fire({
        title: "取消分配地图提示",
        text: "当前服务器未分配该地图",
        icon: "info",
        confirmButtonText: "确定",
      });
      return;
    }
    // 根据已分配的文件名，筛选出所有已分配的文件
    const assignedFiles = toRaw(selectedFiles.value).filter((map) =>
      maps.find((file) => file.mapName === map.name),
    );

    console.log("已分配的文件", assignedFiles);
    // 这里可以添加实际的地图取消分配API调用
    const question = await Swal.fire({
      title: "确认取消分配",
      html: `确定要从服务器 <span style="color: #409EFF;">${serverForm.serverId}</span> 取消分配 <br/> ${assignedFiles.map((file) => `<span style="color: #409EFF;">${file.name}</span>`).join("<br/>")}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "取消分配",
      cancelButtonText: "取消",
    });
    if (!question.isConfirmed) return;
    loading.value = true;
    await mapStore.unassignMap(assignedFiles, serverForm.serverId);
    await Swal.fire({
      title: "成功",
      html: `成功从服务器 <span style="color: #409EFF;">${serverForm.serverId}</span> 取消分配 <br/> ${assignedFiles.map((file) => `<span style="color: #67c23a;">${file.name}</span>`).join("<br/>")}`,
      icon: "success",
      confirmButtonText: "确定",
    });

    showMapAssignmentDialog.value = false;
    selectedFiles.value = [];
    emit("activeServerName", serverForm.serverId);
  } catch (error) {
    console.error("取消分配地图失败:", error);
  } finally {
    loading.value = false;
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

.server-selection-container {
  // padding: 12px;
  background-color: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  margin-bottom: 5px;
  position: sticky;
  top: 0;
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

.collapse-title {
  display: flex;
  align-items: center;
  width: 100%;
  .server-selection-form {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    .el-form-item {
      margin-bottom: 0;
    }
    .server-select {
      // 通过clamp 函数 帮我给上合适的值
      width: clamp(200px, 200px, 300px);
    }
  }
}

.file-list-wrapper {
  min-height: 0;
}
</style>
