<template>
  <div class="login-container">
    <div class="login-form">
      <h2>L4D2 管理面板</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">用户名</label>
          <input
            type="text"
            id="username"
            v-model="username"
            required
            placeholder="请输入用户名"
          />
        </div>
        <div class="form-group">
          <label for="password">密码</label>
          <input
            type="password"
            id="password"
            v-model="password"
            required
            placeholder="请输入密码"
          />
        </div>
        <button type="submit" class="login-button" :disabled="loading">
          {{ loading ? "登录中..." : "登录" }}
        </button>
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

// 注入 Swal 实例
const Swal = inject("$swal");

const router = useRouter();
const authStore = useAuthStore();

const username = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");
const handleLogin = async () => {
  loading.value = true;
  error.value = "";

  try {
    const success = await authStore.login(username.value, password.value);
    // console.log(success);
    if (success) {
      Swal.fire({
        title: "登录成功",
        text: "欢迎回来！",
        icon: "success",
        confirmButtonText: "确定",
      });
      router.push("/dashboard");
    } else {
      error.value = "用户名或密码错误";
    }
  } catch (err) {
    error.value = "登录失败，请稍后重试";
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped lang="scss">
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-form {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.login-form h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-size: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #666;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.login-button {
  width: 100%;
  padding: 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-top: 10px;
}

.login-button:hover:not(:disabled) {
  background: #5a6fd8;
}

.login-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error-message {
  margin-top: 15px;
  color: #e74c3c;
  text-align: center;
  font-size: 14px;
}
</style>
