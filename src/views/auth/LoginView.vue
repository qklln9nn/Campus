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

        <el-tabs v-model="activeTab" class="auth-tabs" stretch>
          <!-- Sign In Tab -->
          <el-tab-pane label="Sign In" name="signin">
            <el-form 
              ref="loginFormRef"
              :model="loginForm" 
              :rules="loginRules"
              label-position="top"
              class="auth-form"
              @submit.prevent="handleLogin"
            >
              <el-form-item label="Portal Role" prop="role">
                <el-select v-model="loginForm.role" placeholder="Select portal role" class="full-width">
                  <el-option label="🎓 Student" value="STUDENT" />
                  <el-option label="📢 Event Organiser" value="ORGANISER" />
                  <el-option label="⚙️ System Administrator" value="ADMIN" />
                </el-select>
              </el-form-item>

              <el-form-item label="Campus Email" prop="email">
                <el-input 
                  v-model.trim="loginForm.email" 
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
                <el-checkbox v-model="loginForm.rememberMe">Remember me</el-checkbox>
                <a href="#" class="forgot-link" @click.prevent="showForgotNotice">Forgot password?</a>
              </div>

              <el-button 
                type="primary" 
                size="large" 
                class="auth-submit-btn" 
                :loading="isSubmitting"
                @click="handleLogin"
              >
                Sign In
              </el-button>
            </el-form>
          </el-tab-pane>

          <!-- Register Tab -->
          <el-tab-pane label="Register Account" name="register">
            <el-form 
              ref="registerFormRef"
              :model="registerForm" 
              :rules="registerRules"
              label-position="top"
              class="auth-form"
              @submit.prevent="handleRegister"
            >
              <el-alert
                title="New accounts are created as students. Organiser access is granted by an administrator."
                type="info"
                show-icon
                :closable="false"
              />

              <el-form-item label="Full Name" prop="name">
                <el-input v-model="registerForm.name" placeholder="e.g. Alex Johnson" :prefix-icon="User" />
              </el-form-item>

              <el-form-item label="Campus Email" prop="email">
                <el-input v-model.trim="registerForm.email" placeholder="student@campus.edu" :prefix-icon="Message" />
              </el-form-item>

              <div class="form-row" v-if="registerForm.role === 'STUDENT'">
                <el-form-item label="Major" prop="major" class="half-width">
                  <el-select v-model="registerForm.major" placeholder="Select major" placement="bottom" popper-class="scrollable-select-popper">
                    <el-option label="Computer Science & Software" value="Computer Science & Software" />
                    <el-option label="Data Science & AI" value="Data Science & AI" />
                    <el-option label="Business & Finance" value="Business & Finance" />
                    <el-option label="Electrical & Electronic Eng" value="Electrical & Electronic Eng" />
                    <el-option label="Mechanical Engineering" value="Mechanical Engineering" />
                    <el-option label="Design, Media & Digital Arts" value="Design, Media & Digital Arts" />
                    <el-option label="Applied Math & Physics" value="Applied Math & Physics" />
                    <el-option label="Biomedical Science" value="Biomedical Science" />
                    <el-option label="Other Majors" value="Other Majors" />
                  </el-select>
                </el-form-item>
                <el-form-item label="Grade Level" prop="grade" class="half-width">
                  <el-select v-model="registerForm.grade" placeholder="Select grade" placement="bottom" popper-class="scrollable-select-popper">
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
                  placeholder="At least 6 characters" 
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
                  I agree to the <a href="#" @click.prevent>Campus Terms of Service</a> & <a href="#" @click.prevent>Privacy Policy</a>
                </el-checkbox>
              </el-form-item>

              <el-button 
                type="primary" 
                size="large" 
                class="auth-submit-btn"
                :loading="isSubmitting"
                @click="handleRegister"
              >
                Create Account & Sign In
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
import { useAuthStore, type UserRole } from '@/stores/authStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const activeTab = ref(route.query.tab === 'register' ? 'register' : 'signin')
const isSubmitting = ref(false)

// Login Form Data
const loginFormRef = ref<FormInstance>()
const loginForm = reactive({
  email: '',
  password: '',
  role: 'STUDENT' as UserRole,
  rememberMe: true,
})

// Robust Custom Email Validator (Supports uppercase, mixed case & ignores whitespace)
const validateEmail = (_rule: any, value: string, callback: any) => {
  if (!value || !value.trim()) {
    callback(new Error('Email is required'))
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value.trim())) {
      callback(new Error('Please enter a valid email address (e.g. user@campus.edu)'))
    } else {
      callback()
    }
  }
}

const loginRules: FormRules = {
  email: [{ validator: validateEmail, trigger: ['blur', 'change'] }],
  password: [
    { required: true, message: 'Please input password', trigger: 'blur' },
    { min: 6, message: 'Password must be at least 6 characters', trigger: 'blur' }
  ],
  role: [{ required: true, message: 'Please select a role', trigger: 'change' }]
}

// Register Form Data
const registerFormRef = ref<FormInstance>()
const registerForm = reactive({
  name: '',
  email: '',
  role: 'STUDENT' as UserRole,
  major: '',
  grade: '',
  password: '',
  confirmPassword: '',
  agreeTerms: false
})

const registerRules: FormRules = {
  name: [{ required: true, message: 'Full name is required', trigger: 'blur' }],
  email: [{ validator: validateEmail, trigger: ['blur', 'change'] }],
  password: [
    { required: true, message: 'Password required', trigger: 'blur' },
    { min: 6, message: 'At least 6 characters', trigger: 'blur' }
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
      trigger: ['blur', 'change'] 
    }
  ]
}

function quickFill(role: UserRole) {
  loginForm.role = role
  if (role === 'STUDENT') {
    loginForm.email = 'alex.johnson@campus.edu'
  } else if (role === 'ORGANISER') {
    loginForm.email = 'sarah.jenkins@campus.edu'
  } else {
    loginForm.email = 'admin@campus.edu'
  }
  handleLogin()
}

async function handleLogin() {
  if (!loginFormRef.value) return
  await loginFormRef.value.validate(async (valid) => {
    if (!valid) return
    isSubmitting.value = true
    const res = await authStore.login(loginForm.email, loginForm.password, loginForm.role)
    isSubmitting.value = false

    if (!res.success) {
      ElMessage.error(res.message || 'Login failed. Please check your credentials or register first.')
      return
    }

    // Authority Role Check: Enforce database role instead of dropdown choice
    const actualRole = authStore.userRole

    if (loginForm.role !== actualRole) {
      ElMessage.warning(`Role Mismatch: Your account is registered as ${actualRole}. Redirecting to your assigned portal.`)
    } else {
      ElMessage.success(`Welcome back! Logged in as ${actualRole.toLowerCase()}.`)
    }

    // Redirect strictly according to authoritative database role
    if (actualRole === 'ORGANISER') {
      router.push('/organiser/dashboard')
    } else if (actualRole === 'ADMIN') {
      router.push('/admin/dashboard')
    } else {
      router.push('/dashboard')
    }
  })
}

async function handleRegister() {
  if (!registerFormRef.value) return
  if (!registerForm.agreeTerms) {
    ElMessage.warning('Please agree to the Campus Terms & Privacy Policy before registering.')
    return
  }

  await registerFormRef.value.validate(async (valid) => {
    if (!valid) return
    isSubmitting.value = true
    const res = await authStore.register({
      name: registerForm.name,
      email: registerForm.email,
      password: registerForm.password,
      role: registerForm.role,
      major: registerForm.major,
      grade: registerForm.grade,
    })
    isSubmitting.value = false

    if (!res.success) {
      ElMessage.error(res.message || 'Registration failed.')
      return
    }

    ElMessage.success('Account created successfully!')

    router.push('/dashboard')
  })
}

function showForgotNotice() {
  ElMessage.info('Password reset instructions have been dispatched to your campus email.')
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

.role-radio-group {
  width: 100%;
  display: flex;
}

.role-radio-group :deep(.el-radio-button) {
  flex: 1;
}

.role-radio-group :deep(.el-radio-button__inner) {
  width: 100%;
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

.demo-accounts-box {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px dashed #e2e8f0;
  text-align: center;
}

.demo-label {
  display: block;
  font-size: 0.8rem;
  color: #64748b;
  margin-bottom: 10px;
  font-weight: 500;
}

.demo-btns {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}
</style>

<style>
/* Global Popper max-height override for dropdown scrollbar */
.scrollable-select-popper .el-select-dropdown__wrap {
  max-height: 190px !important;
  overflow-y: auto !important;
}
</style>
