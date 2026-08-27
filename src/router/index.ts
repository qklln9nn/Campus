import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteRecordRaw,
  type RouterHistory,
} from 'vue-router'

import { pinia } from '@/stores'
import { getRoleHomePath, useAuthStore, type UserRole } from '@/stores/authStore'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
    recoveryOnly?: boolean
    roles?: UserRole[]
  }
}

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/auth/LoginView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('../views/auth/ResetPasswordView.vue'),
    meta: { recoveryOnly: true },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/student/DashboardView.vue'),
    meta: { requiresAuth: true, roles: ['STUDENT'] },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../views/student/ProfileView.vue'),
    meta: { requiresAuth: true, roles: ['STUDENT', 'ORGANISER'] },
  },
  {
    path: '/organiser/dashboard',
    name: 'organiser-dashboard',
    component: () => import('../views/organiser/OrganiserDashboardView.vue'),
    meta: { requiresAuth: true, roles: ['ORGANISER'] },
  },
  {
    path: '/create',
    name: 'create-event',
    component: () => import('../views/organiser/CreateEventView.vue'),
    meta: { requiresAuth: true, roles: ['ORGANISER'] },
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/admin/AdminView.vue'),
    redirect: { name: 'admin-dashboard' },
    meta: { requiresAuth: true, roles: ['ADMIN'] },
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
]

type AuthStore = ReturnType<typeof useAuthStore>

export function createAuthGuard(authStore: AuthStore) {
  return async (to: RouteLocationNormalized) => {
    if (!authStore.authReady) {
      await authStore.initializeAuth()
    }

    if (to.meta.recoveryOnly && (!authStore.isPasswordRecovery || !authStore.isAuthenticated)) {
      if (authStore.isAuthenticated) return getRoleHomePath(authStore.userRole)
      return { name: 'login', query: { recovery: 'invalid' } }
    }

    if (to.meta.guestOnly && authStore.isAuthenticated) {
      return getRoleHomePath(authStore.userRole)
    }

    if (!to.meta.requiresAuth) return true

    if (!authStore.isAuthenticated) {
      return {
        name: 'login',
        query: { redirect: to.fullPath },
      }
    }

    const allowedRoles = to.meta.roles
    if (
      allowedRoles?.length &&
      (!authStore.userRole || !allowedRoles.includes(authStore.userRole))
    ) {
      return getRoleHomePath(authStore.userRole)
    }

    return true
  }
}

export function createAppRouter(
  history: RouterHistory = createWebHistory(import.meta.env.BASE_URL),
) {
  const appRouter = createRouter({
    history,
    routes,
    scrollBehavior(_to, _from, savedPosition) {
      return savedPosition ?? { top: 0, left: 0 }
    },
  })
  appRouter.beforeEach(createAuthGuard(useAuthStore(pinia)))
  return appRouter
}

const router = createAppRouter()

export default router
