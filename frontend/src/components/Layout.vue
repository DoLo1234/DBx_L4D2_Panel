<template>
  <el-container class="app-container">
    <!-- 头部 -->
    <el-header height="60px" class="app-header">
      <div class="header-left">
        <h1>L4D2 管理面板</h1>
      </div>
      <div class="header-right">
        <!-- <el-button type="primary" size="small" @click="handleRefresh">
          刷新状态
        </el-button> -->
        <span>欢迎, {{ authStore.username }}</span>
        <el-button type="danger" size="small" @click="handleLogout"
          >退出登录</el-button
        >
      </div>
    </el-header>

    <!-- 响应式布局容器 -->
    <el-container
      :class="['responsive-container', { 'mobile-container': isMobile }]"
    >
      <!-- 左侧/顶部菜单 -->
      <div
        :class="[
          'app-sidebar',
          {
            'is-collapse': isCollapse && !isMobile,
            'mobile-menu': isMobile,
          },
        ]"
        :style="{ width: isMobile ? '100%' : isCollapse ? '64px' : '200px' }"
      >
        <el-menu
          :default-active="activeMenu"
          :class="[
            isMobile ? 'el-menu-horizontal-demo' : 'el-menu-vertical-demo',
          ]"
          router
          @select="handleMenuSelect"
          :collapse="isCollapse && !isMobile"
          :mode="isMobile ? 'horizontal' : 'vertical'"
          :ellipsis="false"
        >
          <el-menu-item
            v-for="(menuItem, index) in menuItems"
            :key="menuItem.path"
            :index="menuItem.path"
          >
            <el-icon>
              <Icon :icon="menuItem.icon" />
            </el-icon>
            <template #title>
              <span>{{ menuItem.meta.title }}</span>
            </template>
          </el-menu-item>
        </el-menu>

        <!-- 仅在桌面端显示折叠按钮 -->
        <div v-if="!isMobile" class="collapse-btn-container">
          <el-button style="width: 100%" type="primary" @click="toggleCollapse">
            <template #icon>
              <Icon v-if="isCollapse" icon="mdi:arrow-right" />
              <Icon v-else icon="mdi:arrow-left" />
            </template>
          </el-button>
        </div>
      </div>

      <!-- 内容区域 -->
      <el-main :class="['app-content', { 'mobile-content': isMobile }]">
        <router-view v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <keep-alive :exclude="keepAliveExclude">
              <component :is="Component" />
            </keep-alive>
          </Transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, inject } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { Icon } from "@iconify/vue";

const emit = defineEmits(["refresh"]);

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
// 菜单折叠状态
const savedCollapse = localStorage.getItem("isCollapse");
const isCollapse = ref(savedCollapse === "true");
const isMobile = inject("isMobile");
// 菜单图标映射
const iconMap = {
  dashboard: "mdi:view-dashboard",
  plugins: "mdi:puzzle",
  maps: "mdi:folder",
  logs: "mdi:file-document-outline",
  servers: "mdi:server-network",
  instances: "mdi:server-plus",
};

// 计算菜单项目
const menuItems = computed(() => {
  // 从路由配置中动态获取菜单数据
  return router
    .getRoutes()
    .filter((route) => route.meta.requiresAuth && route.children)
    .flatMap((route) => route.children)
    .map((childRoute) => {
      const iconName = childRoute.name;
      // 确保路径格式正确，以/开头
      const fullPath = childRoute.path.startsWith("/")
        ? childRoute.path
        : `/${childRoute.path}`;
      return {
        path: fullPath,
        name: childRoute.name,
        meta: childRoute.meta,
        icon: iconMap[iconName] || "mdi:house",
      };
    });
});

// 切换菜单折叠状态
const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value;
  localStorage.setItem("isCollapse", isCollapse.value);
};

// 计算当前激活的菜单
const activeMenu = computed(() => {
  return route.path || "/dashboard";
});

// 计算 keep-alive 的 exclude 值
const keepAliveExclude = computed(() => {
  if (!route.meta.keepAlive && route.matched.length > 0) {
    const currentRoute = route.matched[route.matched.length - 1];
    return currentRoute.components?.default?.__name || "";
  }
  return "";
});

// 处理菜单选择
const handleMenuSelect = (key, keyPath) => {
  router.push(key);
};

// 退出登录
const handleLogout = () => {
  authStore.logout();
  router.push("/login");
};

// 页面加载时检查登录状态
onMounted(() => {
  if (!authStore.isAuthenticated) {
    router.push("/login");
  }
});
</script>

<style scoped lang="scss">
.app-container {
  height: 100vh;
  background: #f5f7fa;
}

/* 头部样式 */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  height: 60px;
  z-index: 10;
  flex-shrink: 0;

  .header-left {
    h1 {
      margin: 0;
      color: #303133;
      font-size: 18px;
      font-weight: 600;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

/* 响应式布局容器样式 */
.responsive-container {
  display: flex;
  flex-direction: row;
  flex: 1;
  overflow: hidden;
}

/* 移动端容器样式 */
.responsive-container.mobile-container {
  flex-direction: column;
  overflow: hidden;
}

/* 移动端容器的内容区域样式 */
.responsive-container.mobile-container .mobile-content {
  flex: 1;
  // overflow: auto;
}

/* 移动端菜单样式 */
.app-sidebar.mobile-menu {
  height: 60px;
  border-right: none;
  border-bottom: none;
  // 隐藏滚动条
  ::-webkit-scrollbar {
    display: none;
  }
}

/* 侧边栏样式 */
.app-sidebar {
  background-color: #2c3e50 !important;
  width: 200px;
  min-width: 64px;
  height: calc(100vh - 60px);
  overflow-x: hidden;
  overflow-y: auto;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  transition:
    width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  .el-menu {
    border-right: none;
    background-color: transparent !important;
    flex: 1;
    overflow-y: auto;

    .el-menu-item {
      color: #ecf0f1 !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        background-color: #34495e !important;
      }

      &.is-active {
        background-color: #3498db !important;
        color: white !important;
      }

      span {
        transition:
          opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
          transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: inline-block;
      }
    }
  }

  /* 折叠按钮样式 */
  .collapse-btn-container {
    display: flex;
    justify-content: center;
    background: #2c3e50;
    border-top: 1px solid #34495e;
    padding: 10px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* 折叠状态下的样式 */
  &.is-collapse {
    width: 64px;
    box-shadow: 1px 0 4px rgba(0, 0, 0, 0.05);

    .el-menu {
      .el-menu-item {
        padding: 0 20px;

        span {
          opacity: 0;
          transform: translateX(-10px);
        }
      }
    }
  }

  /* 展开状态下的样式 */
  &:not(.is-collapse) {
    .el-menu {
      .el-menu-item {
        span {
          opacity: 1;
          transform: translateX(0);
        }
      }
    }
  }

  /* 移动端菜单样式 */
  &.mobile-menu {
    height: auto;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    overflow-x: auto;
    overflow-y: hidden;

    .el-menu {
      border-right: none;
      overflow-x: auto;
      overflow-y: hidden;
      white-space: nowrap;
    }

    .el-menu-item {
      padding: 0 15px;
      height: 60px;
      line-height: 60px;
      min-width: auto;
    }
  }
}

/* 内容区域样式 */
.app-content {
  padding: 0;
  background: #fff;
  height: calc(100vh - 60px);
  overflow-x: hidden;
  display: flex;
  flex: 1;
}

/* 移动端内容区域样式 */
.mobile-content {
  padding: 0;
  background: #fff;
  height: calc(100vh - 60px - 60px);
  overflow-x: hidden;
  display: flex;
  flex: 1;
}

/* 移动端菜单样式 */
.mobile-menu {
  background: #2c3e50 !important;
  border-bottom: 1px solid #34495e;
  overflow-y: hidden;
  /* 隐藏滚动条但允许滚动 */
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}

.mobile-menu .el-menu {
  border-bottom: none;
  background: #2c3e50 !important;
  overflow: visible;
  white-space: nowrap;
}

.mobile-menu .el-menu-item {
  color: #ecf0f1 !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0 15px;
  height: 60px;
  line-height: 60px;
  min-width: auto;

  &:hover {
    background-color: #34495e !important;
  }

  &.is-active {
    background-color: #3498db !important;
    color: white !important;
  }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .app-header {
    padding: 0 12px;

    h1 {
      font-size: 16px;
    }

    .header-right {
      gap: 8px;

      span {
        font-size: 14px;
      }
    }
  }

  .mobile-menu {
    background: #2c3e50 !important;
  }

  .mobile-menu .el-menu {
    background: #2c3e50 !important;
  }

  .mobile-menu .el-menu-item {
    padding: 0 10px;
    font-size: 14px;
  }
}
/* 路由切换过渡效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
