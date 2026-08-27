<template>
  <div class="auth-page">
    <!-- Top Brand Nav Header -->
    <header class="auth-header">
      <router-link to="/" class="brand-link">
        <div class="brand-icon">
          <el-icon><Calendar /></el-icon>
        </div>
        <span class="brand-text">Campus <span class="brand-highlight">EventHub</span></span>
      </router-link>
      <router-link to="/" class="back-home-btn">
        <el-icon><Back /></el-icon> Return to Home
      </router-link>
    </header>

    <!-- Main Form Container -->
    <main class="auth-main">
      <div class="auth-card-wrapper">
        <div class="auth-card-header">
          <h2>Welcome to EventHub</h2>
          <p class="subtitle">Join campus activities, connect with clubs, and manage events.</p>
        </div>

        <el-alert
          v-if="registrationNotice"
          :title="registrationNotice"
          :type="registrationNoticeType"
          show-icon
          :closable="false"
          class="registration-notice"
        />

        <el-tabs v-model="activeTab" class="auth-tabs" stretch>
          <!-- Sign In Tab -->
          <el-tab-pane label="Sign In (登录)" name="signin">
            <el-form
              ref="loginFormRef"
              :model="loginForm"
              :rules="loginRules"
              label-position="top"
              class="auth-form"
              @submit.prevent="handleLogin"
            >
              <el-form-item label="Campus Email" prop="email">
                <el-input
                  v-model="loginForm.email"
                  placeholder="student@campus.edu"
                  :prefix-icon="User"
                />
              </el-form-item>

              <el-form-item label="Password" prop="password">
                <el-input
                  v-model="loginForm.password"
                  type="password"
                  placeholder="Enter your password"
                  show-password
                  :prefix-icon="Lock"
                />
              </el-form-item>

              <div class="form-options">
                <span></span>
                <a href="#" class="forgot-link" @click.prevent="handleForgotPassword"
                  >Forgot password?</a
                >
              </div>

              <el-button
                type="primary"
                size="large"
                class="auth-submit-btn"
                :loading="isSubmitting"
                native-type="submit"
              >
                Sign In
              </el-button>
            </el-form>
          </el-tab-pane>

          <!-- Register Tab -->
          <el-tab-pane label="Register (注册)" name="register">
            <el-form
              ref="registerFormRef"
              :model="registerForm"
              :rules="registerRules"
              label-position="top"
              class="auth-form"
              @submit.prevent="handleRegister"
            >
              <el-alert
                title="Self-registration creates a student account. Organiser access is granted by a campus administrator."
                type="info"
                show-icon
                :closable="false"
                class="account-type-notice"
              />

              <el-form-item label="Full Name" prop="name">
                <el-input
                  v-model="registerForm.name"
                  placeholder="e.g. Alex Johnson"
                  :prefix-icon="User"
                />
              </el-form-item>

              <el-form-item label="Campus Email" prop="email">
                <el-input
                  v-model="registerForm.email"
                  placeholder="student@campus.edu"
                  :prefix-icon="Message"
                />
              </el-form-item>

              <div class="form-row">
                <el-form-item label="Major (专业)" prop="major" class="half-width">
                  <el-input v-model="registerForm.major" placeholder="e.g. Computer Science" />
                </el-form-item>
                <el-form-item label="Grade (年级)" prop="grade" class="half-width">
                  <el-select v-model="registerForm.grade" placeholder="Select grade">
                    <el-option label="Freshman (Year 1)" value="Freshman (Year 1)" />
                    <el-option label="Sophomore (Year 2)" value="Sophomore (Year 2)" />
                    <el-option label="Junior (Year 3)" value="Junior (Year 3)" />
                    <el-option label="Senior (Year 4)" value="Senior (Year 4)" />
                    <el-option label="Postgraduate" value="Postgraduate" />
                  </el-select>
                </el-form-item>
              </div>

              <el-form-item label="Password" prop="password">
                <el-input
                  v-model="registerForm.password"
                  type="password"
                  placeholder="At least 8 characters"
                  show-password
                  :prefix-icon="Lock"
                />
              </el-form-item>

              <el-form-item label="Confirm Password" prop="confirmPassword">
                <el-input
                  v-model="registerForm.confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  show-password
                  :prefix-icon="Lock"
                />
              </el-form-item>

              <el-form-item prop="agreeTerms">
                <el-checkbox v-model="registerForm.agreeTerms">
                  I agree to the <a href="#" @click.prevent>Campus Terms of Service</a> &
                  <a href="#" @click.prevent>Privacy Policy</a>
                </el-checkbox>
              </el-form-item>

              <el-button
                type="primary"
                size="large"
                class="auth-submit-btn"
                :loading="isSubmitting"
                native-type="submit"
              >
                Create Student Account
              </el-button>
            </el-form>
          </el-tab-pane>
        </el-tabs>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Calendar, Back, User, Lock, Message } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { getRoleHomePath, useAuthStore } from '@/stores/authStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const activeTab = ref(route.query.tab === 'register' ? 'register' : 'signin')
const isSubmitting = ref(false)
const registrationNoticeType = ref<'success' | 'warning'>(
  route.query.recovery === 'invalid' ? 'warning' : 'success',
)
const registrationNotice = ref(
  route.query.recovery === 'invalid'
    ? 'This password recovery link is invalid or expired. Request a new one.'
    : route.query.confirmed === '1'
      ? 'Email confirmed. You can now sign in.'
      : route.query.passwordUpdated === '1'
        ? 'Password updated. Sign in with your new password.'
        : '',
)

const loginFormRef = ref<FormInstance>()
const loginForm = reactive({
  email: '',
  password: '',
})

const loginRules: FormRules = {
  email: [
    { required: true, message: 'Please input campus email', trigger: 'blur' },
    { type: 'email', message: 'Please enter a valid email address', trigger: ['blur', 'change'] },
  ],
  password: [{ required: true, message: 'Please input password', trigger: 'blur' }],
}

const registerFormRef = ref<FormInstance>()
const registerForm = reactive({
  name: '',
  email: '',
  major: '',
  grade: '',
  password: '',
  confirmPassword: '',
  agreeTerms: false,
})

const registerRules: FormRules = {
  name: [{ required: true, message: 'Full name is required', trigger: 'blur' }],
  email: [
    { required: true, message: 'Email is required', trigger: 'blur' },
    { type: 'email', message: 'Valid email required', trigger: ['blur', 'change'] },
  ],
  password: [
    { required: true, message: 'Password required', trigger: 'blur' },
    { min: 8, message: 'At least 8 characters', trigger: 'blur' },
  ],
  confirmPassword: [
    {
      validator: (_rule, value, callback) => {
        if (!value) {
          callback(new Error('Please confirm your password'))
        } else if (value !== registerForm.password) {
          callback(new Error('Passwords do not match'))
        } else {
          callback()
        }
      },
      trigger: ['blur', 'change'],
    },
  ],
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

async function validateForm(form: FormInstance | undefined): Promise<boolean> {
  if (!form) return false
  return form.validate().catch(() => false)
}

function safeRedirectPath(): string | null {
  const redirect = route.query.redirect
  if (typeof redirect !== 'string' || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return null
  }
  return redirect
}

async function handleLogin() {
  if (!(await validateForm(loginFormRef.value))) return

  isSubmitting.value = true
  try {
    const profile = await authStore.login(loginForm.email, loginForm.password)
    ElMessage.success(`Welcome back, ${profile.name}.`)
    await router.replace(safeRedirectPath() ?? getRoleHomePath(profile.role))
  } catch (error) {
    ElMessage.error(errorText(error, 'Unable to sign in.'))
  } finally {
    isSubmitting.value = false
  }
}

async function handleRegister() {
  if (!registerForm.agreeTerms) {
    ElMessage.warning('Please agree to the Campus Terms & Privacy Policy before registering.')
    return
  }
  if (!(await validateForm(registerFormRef.value))) return

  isSubmitting.value = true
  registrationNoticeType.value = 'success'
  registrationNotice.value = ''
  try {
    const result = await authStore.register({
      name: registerForm.name,
      email: registerForm.email,
      password: registerForm.password,
      major: registerForm.major,
      grade: registerForm.grade,
    })

    if (result.requiresEmailConfirmation) {
      registrationNotice.value =
        'Account created. Check your campus email to confirm it before signing in.'
      loginForm.email = registerForm.email
      loginForm.password = ''
      activeTab.value = 'signin'
      ElMessage.success('Confirmation email sent.')
      return
    }

    ElMessage.success('Account created successfully!')
    await router.replace(getRoleHomePath(result.profile?.role))
  } catch (error) {
    ElMessage.error(errorText(error, 'Unable to create your account.'))
  } finally {
    isSubmitting.value = false
  }
}

async function handleForgotPassword() {
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginForm.email.trim())
  if (!emailValid) {
    ElMessage.warning('Enter your campus email first, then request a password reset.')
    return
  }

  isSubmitting.value = true
  try {
    await authStore.requestPasswordReset(loginForm.email)
    ElMessage.success('Password reset instructions have been sent if that account exists.')
  } catch (error) {
    ElMessage.error(errorText(error, 'Unable to send the password reset email.'))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #312e81 100%);
  display: flex;
  flex-direction: column;
}

.auth-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}

.brand-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 22px;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
}

.brand-text {
  font-size: 1.35rem;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.5px;
}

.brand-highlight {
  color: #818cf8;
}

.back-home-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #94a3b8;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.2s;
}

.back-home-btn:hover {
  color: #ffffff;
}

.auth-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px 20px;
}

.auth-card-wrapper {
  background: #ffffff;
  border-radius: 20px;
  width: 100%;
  max-width: 480px;
  padding: 36px 32px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
}

.auth-card-header {
  text-align: center;
  margin-bottom: 24px;
}

.auth-card-header h2 {
  font-size: 1.65rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 6px;
}

.subtitle {
  color: #64748b;
  font-size: 0.88rem;
  line-height: 1.4;
}

.auth-tabs :deep(.el-tabs__item) {
  font-size: 0.95rem;
  font-weight: 600;
  padding: 12px 0;
}

.auth-form {
  margin-top: 16px;
}

.registration-notice,
.account-type-notice {
  margin-top: 16px;
}

.full-width {
  width: 100%;
}

.form-row {
  display: flex;
  gap: 12px;
}

.half-width {
  flex: 1;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.forgot-link {
  color: #4f46e5;
  font-size: 0.85rem;
  text-decoration: none;
}

.forgot-link:hover {
  text-decoration: underline;
}

.auth-submit-btn {
  width: 100%;
  height: 46px;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 10px;
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  border: none;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.auth-submit-btn:hover {
  opacity: 0.95;
}
</style>
