<template>
  <div class="instances-panel" :class="{ 'is-mobile': isMobile }">
    <el-row :gutter="10">
      <el-col
        :xs="24"
        :sm="12"
        :md="8"
        :lg="8"
        :xl="6"
        v-for="instance in instances"
        :key="instance.port"
      >
        <el-card
          class="instance-card"
          :class="{ 'instance-running': instance.status === 'running' }"
        >
          <template #header>
            <div class="instance-header">
              <span>{{ instance.name }}</span>
              <el-tag
                :type="instance.status === 'running' ? 'success' : 'danger'"
              >
                {{ instance.status === "running" ? "运行中" : "已停止" }}
              </el-tag>
            </div>
          </template>
          <!-- 翻转容器 -->
          <div class="flip-container">
            <!-- 正面 - 基本信息 -->
            <div
              class="flip-card front"
              :class="{ flipped: instance.status === 'running' }"
              @click="handleInstanceClick(instance)"
            >
              <el-descriptions :column="1" size="small">
                <el-descriptions-item label="服务器ID">
                  {{ instance.serverId }}
                </el-descriptions-item>
                <el-descriptions-item label="游戏端口">
                  {{ instance.port }}
                </el-descriptions-item>
                <el-descriptions-item label="服务器名">
                  {{ instance.hostName }}
                </el-descriptions-item>
                <el-descriptions-item label="最大玩家">
                  {{ instance.maxPlayers }}
                </el-descriptions-item>
                <el-descriptions-item label="启动地图">
                  {{ instance.startMap }}
                </el-descriptions-item>
                <el-descriptions-item label="额外参数">
                  {{ instance.extraParams || "无" }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
            <!-- 背面 - 运行状态信息 -->
            <div
              class="flip-card back"
              :class="{ flipped: instance.status === 'running' }"
            >
              <el-descriptions :column="1" size="small">
                <el-descriptions-item label="服务器名">
                  {{ instance.runInfo?.name || instance.name }}
                </el-descriptions-item>
                <el-descriptions-item label="当前地图">
                  {{ instance.runInfo?.map || "无" }}
                </el-descriptions-item>
                <el-descriptions-item label="玩家数量">
                  {{ instance.runInfo?.players || 0 }}/{{
                    instance.runInfo?.maxPlayers || instance.maxPlayers
                  }}
                </el-descriptions-item>
                <el-descriptions-item label="服务器版本">
                  {{ instance.runInfo?.version || "未知" }}
                </el-descriptions-item>
                <el-descriptions-item label="连接地址">
                  {{ instance.runInfo?.connect || "无" }}
                </el-descriptions-item>
                <el-descriptions-item label="游戏模式">
                  {{ instance.runInfo?.tags?.join(", ") || "无" }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </div>

          <div class="instance-actions">
            <el-button
              type="success"
              size="small"
              @click="handleStart(instance)"
              v-if="instance.status === 'stopped'"
              :disabled="instance.status === 'running'"
            >
              启动
            </el-button>
            <el-button
              type="info"
              size="small"
              @click="handleRestart(instance)"
              v-if="instance.status === 'running'"
              :disabled="instance.status === 'stopped'"
            >
              重启
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="handleStop(instance)"
              :disabled="instance.status === 'stopped'"
            >
              停止
            </el-button>
            <el-button
              type="warning"
              size="small"
              @click="handleDelete(instance.name)"
              :disabled="instance.status === 'running'"
            >
              删除
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 无实例提示 -->
    <div v-if="instances.length === 0" class="no-instances">
      <el-empty description="暂无服务器实例" style="margin: 60px 0"> </el-empty>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from "vue";
import { Icon } from "@iconify/vue";

// 注入 Swal 实例
const Swal = inject("$swal");
// Props
const props = defineProps({
  /**
   * 实例列表
   */
  instances: {
    type: Array,
    default: () => [],
  },
  /**
   * 已部署的服务器列表
   */
  deployedServers: {
    type: Array,
    default: () => [],
  },
  /**
   * 是否启用编辑功能
   */
  enableEdit: {
    type: Boolean,
    default: true,
  },
});

const isMobile = ref(inject("isMobile"));

// Emits
const emit = defineEmits([
  "refresh",
  "start",
  "stop",
  "delete",
  "instance-click",
  "restart",
]);

// Methods
const handleRefresh = () => {
  emit("refresh");
};

const handleInstanceClick = (instance) => {
  // 触发instance-click事件
  emit("instance-click", instance);
};

const handleStart = (instance) => {
  // console.log("handleStart", instance);
  emit("start", instance);
};

const handleRestart = (instance) => {
  emit("restart", instance);
};

const handleStop = (instance) => {
  emit("stop", instance);
};

const handleDelete = (instanceName) => {
  emit("delete", instanceName);
};
</script>

<style scoped lang="scss">
.card-header {
  display: flex;
  align-items: center;
  gap: 5px;
  // justify-content: space-between;

  .header-buttons {
    display: flex;
    margin-left: auto;
  }
}

.instances-panel {
  border-radius: 12px;
  flex: 1;
  :deep(.el-card__body) {
    padding: 10px;
  }
  .instance-card {
    margin-bottom: 10px;
  }
}

.is-mobile {
  // min-height: 100%;
  // 隐藏滚动条
  ::-webkit-scrollbar {
    display: none;
  }
  :deep(.el-card__body) {
    padding: 10px;
  }
}

.instance-card {
  // margin-bottom: 10px;
  transition: all 0.3s ease;
  min-height: 300px;
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.7);

  :deep(.el-card__body) {
    padding: 10px;
  }
}

.instance-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(15px);
  background-color: rgba(255, 255, 255, 0.8);
  .instance-details {
    cursor: pointer;
  }
}

.instance-card.instance-running {
  border-left: 3px solid rgba(103, 194, 58, 0.8);
  background: linear-gradient(
    135deg,
    rgba(103, 194, 58, 0.08),
    rgba(255, 255, 255, 0.7)
  );
  backdrop-filter: blur(10px);

  /* 确保el-descriptions背景透明 */
  :deep(.el-descriptions) {
    background-color: transparent !important;
  }

  :deep(.el-descriptions__body) {
    background-color: transparent !important;
  }

  :deep(.el-descriptions__item) {
    background-color: transparent !important;
  }
}

.instance-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.instance-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
  position: relative;
  z-index: 1;
}

.no-instances {
  text-align: center;
}

/* 翻转效果样式 */
.flip-container {
  perspective: 1000px;
  margin: 10px 0;
  height: 200px;
  position: relative;
}

.flip-card {
  width: 100%;
  height: 100%;
  transition: transform 1s;
  transform-style: preserve-3d;
  position: absolute;
  top: 0;
  left: 0;
}

.flip-card.front {
  z-index: 2;
}

.flip-card.back {
  z-index: 1;
  transform: rotateY(180deg);
}

.flip-card.flipped {
  transform: rotateY(180deg);
}

.flip-card.front.flipped {
  z-index: 1;
}

.flip-card.back.flipped {
  z-index: 2;
  transform: rotateY(0deg);
}

/* 确保翻牌后内容显示正常 */
.flip-card {
  backface-visibility: hidden;
  padding: 10px;
  border-radius: 4px;
}

.flip-card.front {
  background-color: transparent;
}

.flip-card.back {
  background-color: transparent;
}

/* 运行中的实例卡片高度调整 */
// .instance-card.instance-running .flip-container {
//   height: 220px;
// }
</style>
