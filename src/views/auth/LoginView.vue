<template>
  <div class="auth-page">
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
          <el-tab-pane label="Sign In" name="signin">
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

              <div class="form-row">
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
import { ElMessage, type FormInstance, type FormItemRule, type FormRules } from 'element-plus'
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

// Login Form Data
const loginFormRef = ref<FormInstance>()
const loginForm = reactive({
  email: '',
  password: '',
})

// Robust Custom Email Validator (Supports uppercase, mixed case & ignores whitespace)
const validateEmail = (_rule: FormItemRule, value: string, callback: (error?: Error) => void) => {
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
}

// Register Form Data
const registerFormRef = ref<FormInstance>()
const registerForm = reactive({
  name: '',
  email: '',
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

//function for login
async function handleLogin() {
  //trigger the front-end form rule validation
  if (!(await validateForm(loginFormRef.value))) return

  isSubmitting.value = true
  try {
    //login function in authstore (Pinia)
    const profile = await authStore.login(loginForm.email, loginForm.password)
    ElMessage.success(`Welcome back, ${profile.name}.`)
    await router.replace(safeRedirectPath() ?? getRoleHomePath(profile.role))
  } catch (error) {
    ElMessage.error(errorText(error, 'Unable to sign in.'))
  } finally {
    isSubmitting.value = false
  }
}

//new auth register function
async function handleRegister() {
  //check if the user agrees to the terms and conditions
  if (!registerForm.agreeTerms) {
    ElMessage.warning('Please agree to the Campus Terms & Privacy Policy before registering.')
    return
  }
  //trigger the front-end form rule validation
  if (!(await validateForm(registerFormRef.value))) return

  isSubmitting.value = true
  registrationNoticeType.value = 'success'
  registrationNotice.value = ''
  try {
    //register function in authstore (Pinia)
    const result = await authStore.register({
      name: registerForm.name,
      email: registerForm.email,
      password: registerForm.password,
      major: registerForm.major,
      grade: registerForm.grade,
    })

    //if the user needs to confirm their email to login
    //(haven't implemented email confirmation function in the backend yet)
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
</script>

<style scoped src="@/assets/styles/AuthPage.css"></style>
