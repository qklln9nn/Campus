import { createRouter, createWebHistory } from 'vue-router'

/**
 * Vue Router configuration for Campus EventHub
 * Defines routes for student dashboard, organiser portal, and admin console.
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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

export default router
