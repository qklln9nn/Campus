import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { ElMessage } from 'element-plus'

/**
 * Vue Router configuration for Campus EventHub
 * Defines routes for student dashboard, organiser portal, and admin console.
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0, left: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/auth/LoginView.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/student/DashboardView.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/student/ProfileView.vue'),
    },
    {
      path: '/organiser/dashboard',
      name: 'organiser-dashboard',
      component: () => import('../views/organiser/OrganiserDashboardView.vue'),
    },
    {
      path: '/create',
      name: 'create-event',
      component: () => import('../views/organiser/CreateEventView.vue'),
    },
    {
      path: '/admin',
      component: () => import('../views/admin/AdminView.vue'),
      redirect: '/admin/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'admin-dashboard',
          component: () => import('../views/admin/AdminDashboardView.vue'),
        },
        {
          path: 'events',
          name: 'admin-events',
          component: () => import('../views/admin/AdminEventsView.vue'),
        },
        {
          path: 'users',
          name: 'admin-users',
          component: () => import('../views/admin/AdminUsersView.vue'),
        },
        {
          path: 'reports',
          name: 'admin-reports',
          component: () => import('../views/admin/AdminReportsView.vue'),
        },
        {
          path: 'settings',
          name: 'admin-settings',
          component: () => import('../views/admin/AdminSettingsView.vue'),
        },
      ],
    },
  ],
})

/**
 * Global Navigation Guard: Strict Role-Based Access Control (RBAC)
 */
router.beforeEach((to, _from, next) => {
  // Lazy import authStore to avoid circular dependency
  const authStore = useAuthStore()

  // 1. Unauthenticated Protection
  const publicRoutes = ['home', 'login']
  if (!authStore.isAuthenticated && !publicRoutes.includes(to.name as string)) {
    ElMessage.info('Please sign in first to access your portal.')
    return next({ name: 'login' })
  }

  // 2. Role-Based Access Enforcement
  if (authStore.isAuthenticated) {
    const role = authStore.userRole

    // Organiser Portal Guidance: Auto-redirect Organisers to Organiser Console
    if (to.path === '/dashboard' && role === 'ORGANISER') {
      return next({ path: '/organiser/dashboard' })
    }

    // Organiser Routes Protection: Prevent Student Access
    if ((to.path.startsWith('/organiser') || to.path === '/create') && role === 'STUDENT') {
      ElMessage.error('Access Denied: Student accounts cannot access the Organiser Console.')
      return next({ path: '/dashboard' })
    }

    // Admin Routes Protection: Prevent Non-Admin Access
    if (to.path.startsWith('/admin') && role !== 'ADMIN') {
      ElMessage.error('Access Denied: Administrator role required.')
      return next({ path: role === 'ORGANISER' ? '/organiser/dashboard' : '/dashboard' })
    }
  }

  next()
})

export default router
