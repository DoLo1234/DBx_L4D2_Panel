<script setup>
// App.vue - 应用根组件
import { computed, ref, onMounted, onUnmounted, provide } from "vue";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import en from "element-plus/es/locale/lang/en";

const language = ref("zh-cn");
const locale = computed(() => (language.value === "zh-cn" ? zhCn : en));

// 响应式布局状态
const isMobile = ref(false);
// 检测屏幕宽度
const checkScreenWidth = () => {
  isMobile.value = window.innerWidth < 768;
};

const buttonSize = computed(() => (isMobile.value ? "small" : "default"));
// 注入响应式布局状态到子组件
provide("isMobile", isMobile);

// 监听屏幕宽度变化
onMounted(() => {
  checkScreenWidth();
  window.addEventListener("resize", checkScreenWidth);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkScreenWidth);
});
</script>

<template>
  <el-config-provider :locale="locale" :size="buttonSize">
    <router-view />
  </el-config-provider>
</template>

<style lang="scss">
/* 全局样式重置 */
</style>
