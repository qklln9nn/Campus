<template>
  <div class="reset-page">
    <header class="reset-header">
      <router-link to="/" class="brand-link">
        <el-icon><Calendar /></el-icon>
        <span>Campus EventHub</span>
      </router-link>
    </header>

    <main class="reset-main">
      <el-card class="reset-card" shadow="always">
        <template #header>
          <div class="card-heading">
            <el-icon :size="28"><Lock /></el-icon>
            <div>
              <h1>Set a new password</h1>
              <p>Choose a password you have not used for this account before.</p>
            </div>
          </div>
        </template>

        <el-alert
          v-if="
            authStore.authReady && (!authStore.isPasswordRecovery || !authStore.isAuthenticated)
          "
          title="This password recovery link is invalid or has expired. Request a new link from the sign-in page."
          type="warning"
          show-icon
          :closable="false"
        />

        <el-form
          v-else
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          @submit.prevent="handleSubmit"
        >
          <el-form-item label="New password" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              show-password
              autocomplete="new-password"
              :prefix-icon="Lock"
            />
          </el-form-item>

          <el-form-item label="Confirm new password" prop="confirmPassword">
            <el-input
              v-model="form.confirmPassword"
              type="password"
              show-password
              autocomplete="new-password"
              :prefix-icon="Lock"
            />
          </el-form-item>

          <el-button
            type="primary"
            class="submit-button"
            native-type="submit"
            :loading="isSubmitting"
          >
            Update password
          </el-button>
        </el-form>

        <router-link to="/login" class="back-link">Back to sign in</router-link>
      </el-card>
    </main>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Calendar, Lock } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'

import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref<FormInstance>()
const isSubmitting = ref(false)

const form = reactive({
  password: '',
  confirmPassword: '',
})

const rules: FormRules = {
  password: [
    { required: true, message: 'Enter a new password', trigger: 'blur' },
    { min: 8, message: 'Use at least 8 characters', trigger: 'blur' },
  ],
  confirmPassword: [
    {
      validator: (_rule, value, callback) => {
        if (!value) callback(new Error('Confirm your new password'))
        else if (value !== form.password) callback(new Error('Passwords do not match'))
        else callback()
      },
      trigger: ['blur', 'change'],
    },
  ],
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  isSubmitting.value = true
  try {
    await authStore.updatePassword(form.password)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Unable to update your password.')
    isSubmitting.value = false
    return
  }

  try {
    await authStore.logout()
  } catch {
    // The store clears local session state even if the remote sign-out request fails.
  } finally {
    isSubmitting.value = false
  }

  ElMessage.success('Password updated. Sign in with your new password.')
  await router.replace('/login?passwordUpdated=1')
}
</script>

<style scoped>
.reset-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #172554, #312e81 55%, #4f46e5);
}

.reset-header {
  height: 72px;
  display: flex;
  align-items: center;
  padding: 0 6vw;
  background: rgba(15, 23, 42, 0.36);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.brand-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: white;
  font-size: 1.1rem;
  font-weight: 700;
  text-decoration: none;
}

.reset-main {
  min-height: calc(100vh - 72px);
  display: grid;
  place-items: center;
  padding: 32px 20px;
}

.reset-card {
  width: min(440px, 100%);
  border: 0;
  border-radius: 18px;
}

.card-heading {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  color: #312e81;
}

.card-heading h1 {
  margin: 0 0 6px;
  color: #0f172a;
  font-size: 1.4rem;
}

.card-heading p {
  margin: 0;
  color: #64748b;
  font-size: 0.88rem;
  line-height: 1.5;
}

.submit-button {
  width: 100%;
  height: 44px;
}

.back-link {
  display: block;
  margin-top: 18px;
  color: #4f46e5;
  text-align: center;
  text-decoration: none;
}
</style>
