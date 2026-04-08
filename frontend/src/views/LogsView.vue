<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>操作日志</span>
        <div class="logs-actions">
          <el-select
            v-model="logType"
            placeholder="所有类型"
            size="small"
            style="width: 120px; margin-right: 10px"
            @change="getLogs"
          >
            <el-option label="所有类型" value=""></el-option>
            <el-option label="认证日志" value="auth"></el-option>
            <el-option label="Steam日志" value="steam"></el-option>
            <el-option label="服务器日志" value="server"></el-option>
            <el-option label="插件日志" value="plugin"></el-option>
            <el-option label="应用日志" value="app"></el-option>
            <el-option label="地图日志" value="map"></el-option>
          </el-select>
          <el-button type="primary" size="small" @click="getLogs">
            刷新
          </el-button>
          <el-button type="danger" size="small" @click="clearLogs">
            清空日志
          </el-button>
        </div>
      </div>
    </template>

    <div v-if="logStore.loading" class="loading">加载中...</div>
    <div v-else-if="logStore.logs.length === 0" class="no-logs">暂无日志</div>
    <div class="warpper" :class="{ mobile: isMobile }" v-else>
      <el-table :data="logStore.logs" style="width: 100%" stripe>
        <el-table-column prop="timestamp" label="时间" width="200">
          <template #default="scope">
            {{ formatTime(scope.row.timestamp) }}
          </template>
        </el-table-column>
        <el-table-column prop="file" label="类型" width="100">
          <template #default="scope">
            {{ getLogType(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column prop="message" label="内容" show-overflow-tooltip>
          <template #default="scope">
            {{ scope.row.message || JSON.stringify(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column prop="file" label="文件" width="150">
          <template #default="scope">
            {{ scope.row.file }}
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="logLimit"
          :page-sizes="[10, 20, 50, 100]"
          :layout="checkScreenWidth"
          :total="logStore.totalLogs"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { ref, onMounted, computed, inject } from "vue";
import { useLogStore } from "@/stores/log";

// 注入 Swal 实例
const Swal = inject("$swal");

const logStore = useLogStore();
const logType = ref("");
const logLimit = ref(20);
const currentPage = ref(1);

const isMobile = inject("isMobile");

// 检测屏幕宽度
const checkScreenWidth = computed(() => {
  if (isMobile.value) {
    // 移动端只显示必要的分页控件
    return "total, sizes, prev, next";
  } else {
    // 桌面端显示完整控件
    return "total, sizes, prev, pager, next";
  }
});

// 页面加载时获取日志
onMounted(() => {
  getLogs();
});

// 获取日志
const getLogs = async () => {
  try {
    await logStore.getLogs({
      type: logType.value,
      limit: logLimit.value,
      page: currentPage.value,
    });
  } catch (error) {
    console.error("获取日志失败:", error);
  }
};

// 处理分页大小变化
const handleSizeChange = (size) => {
  logLimit.value = size;
  currentPage.value = 1;
  getLogs();
};

// 处理当前页变化
const handleCurrentChange = (current) => {
  currentPage.value = current;
  getLogs();
};

// 清空日志
const clearLogs = async () => {
  Swal.fire({
    title: "确认清空",
    text: "确定要清空所选类型的日志吗？此操作不可恢复。",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "确定",
    cancelButtonText: "取消",
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await logStore.clearLogs({
          type: logType.value,
        });
        Swal.fire({
          title: "清空成功",
          text: "日志已清空",
          icon: "success",
          confirmButtonText: "确定",
        });
        // 刷新日志列表
        getLogs();
      } catch (error) {
        console.error("清空日志失败:", error);
        Swal.fire({
          title: "错误",
          text: "清空日志失败",
          icon: "error",
          confirmButtonText: "确定",
        });
      }
    }
  });
};

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

// 获取日志类型
const getLogType = (log) => {
  if (log.file && log.file.includes("auth")) return "认证";
  if (log.file && log.file.includes("server")) return "服务器";
  if (log.file && log.file.includes("plugin")) return "插件";
  if (log.file && log.file.includes("app")) return "应用";
  return "其他";
};
</script>

<style scoped lang="scss">
.el-card {
  height: 100%;
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  border-radius: 0 !important;
  :deep(.el-card__body) {
    flex: 1;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  span {
    font-size: 16px;
    font-weight: 500;
    color: #303133;
  }

  .logs-actions {
    display: flex;
    align-items: center;
  }
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.no-logs {
  text-align: center;
  padding: 40px;
  color: #666;
}

/* 分页样式 */
.pagination-container {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.warpper {
  padding: 20px;
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;

  &.mobile {
    padding: 10px;
  }
}

.el-table {
  height: 100%;
}
</style>
