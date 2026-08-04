import { createRouter, createWebHistory } from 'vue-router'

/**
 * Vue Router configuration for Campus EventHub
 * Defines routes for authentication, student dashboard, organiser actions, and admin console.
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/login',
      name: 'login',
      // Authentication Login View
      component: () => import('../views/auth/LoginView.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      // Student Dashboard View
      component: () => import('../views/student/DashboardView.vue'),
    },
    {
      path: '/create',
      name: 'create-event',
      // Organiser Event Creation View
      component: () => import('../views/organiser/CreateEventView.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      // Admin Management Console View
      component: () => import('../views/admin/AdminView.vue'),
    },
  ],
})

export default router
