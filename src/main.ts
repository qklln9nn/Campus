import './assets/main.css'
import 'element-plus/dist/index.css'

import { createApp, watch } from 'vue'
import ElementPlus from 'element-plus'

import App from './App.vue'
import router from './router'
import { pinia } from './stores'
import { getRoleHomePath, useAuthStore } from './stores/authStore'
import { useEventStore } from './stores/eventStore'

const app = createApp(App)

app.use(pinia)
app.use(ElementPlus)

async function bootstrap() {
  const authStore = useAuthStore(pinia)
  const eventStore = useEventStore(pinia)
  watch(
    () => authStore.session?.user.id,
    (userId, previousUserId) => {
      if (userId !== previousUserId) eventStore.resetUserActivity()
    },
  )

  await authStore.initializeAuth()

  app.use(router)
  await router.isReady()

  watch([() => authStore.session?.user.id, () => authStore.currentUser?.id], () => {
    const currentRoute = router.currentRoute.value
    if (!currentRoute.meta.requiresAuth) return

    if (!authStore.isAuthenticated) {
      if (!authStore.session) {
        void router.replace({
          name: 'login',
          query: { redirect: currentRoute.fullPath },
        })
      }
      return
    }

    const allowedRoles = currentRoute.meta.roles
    if (
      allowedRoles?.length &&
      (!authStore.userRole || !allowedRoles.includes(authStore.userRole))
    ) {
      void router.replace(getRoleHomePath(authStore.userRole))
    }
  })

  app.mount('#app')
}

void bootstrap()
