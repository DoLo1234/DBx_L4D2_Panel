import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginView.vue"),
      meta: {
        title: "登录页面",
        requiresAuth: false,
      },
    },
    {
      path: "/",
      redirect: "/dashboard",
      component: () => import("@/components/Layout.vue"),
      meta: { requiresAuth: true },
      children: [
        {
          path: "dashboard",
          name: "dashboard",
          component: () => import("@/views/DashboardView.vue"),
          meta: {
            title: "仪表盘",
            keepAlive: false,
          },
        },
        {
          path: "servers",
          name: "servers",
          component: () => import("@/views/Server/ServerManagementView.vue"),
          meta: {
            title: "服务器管理",
            keepAlive: true,
          },
        },
        {
          path: "instances",
          name: "instances",
          component: () => import("@/views/InstancesView.vue"),
          meta: {
            title: "实例管理",
            keepAlive: true,
          },
        },
        {
          path: "maps",
          name: "maps",
          component: () => import("@/views/Map/MapManagementView.vue"),
          meta: {
            title: "地图管理",
            keepAlive: true,
          },
        },
        {
          path: "plugins",
          name: "plugins",
          component: () => import("@/views/Plugin/PluginsView.vue"),
          meta: {
            title: "插件管理",
            keepAlive: true,
          },
        },
        {
          path: "logs",
          name: "logs",
          component: () => import("@/views/LogsView.vue"),
          meta: {
            title: "日志管理",
            keepAlive: false,
          },
        },
      ],
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: () => import("@/views/NotFound.vue"),
      meta: {
        title: "404 - 页面未找到",
        requiresAuth: false,
      },
    },
  ],
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  // console.log("requiresAuth: ", requiresAuth, authStore.isAuthenticated);
  if (requiresAuth && !authStore.isAuthenticated) {
    next({ name: "login" });
  } else {
    next();
  }
});

export default router;
