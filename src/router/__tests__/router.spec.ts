import type { RouteLocationNormalized } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'

import { createAuthGuard } from '@/router'
import type { UserRole } from '@/stores/authStore'

vi.mock('@/lib/supabase', () => ({
  supabase: {},
}))

type GuardStore = Parameters<typeof createAuthGuard>[0]

interface TestRouteMeta {
  requiresAuth?: boolean
  guestOnly?: boolean
  recoveryOnly?: boolean
  roles?: UserRole[]
}

function createRoute(fullPath: string, meta: TestRouteMeta): RouteLocationNormalized {
  return { fullPath, meta } as RouteLocationNormalized
}

function createStore(
  overrides: Partial<{
    authReady: boolean
    isAuthenticated: boolean
    isPasswordRecovery: boolean
    userRole: UserRole | null
    initializeAuth: () => Promise<void>
  }> = {},
) {
  return {
    authReady: true,
    isAuthenticated: false,
    isPasswordRecovery: false,
    userRole: null as UserRole | null,
    initializeAuth: vi.fn<() => Promise<void>>(async () => undefined),
    ...overrides,
  }
}

function asGuardStore(store: ReturnType<typeof createStore>): GuardStore {
  return store as unknown as GuardStore
}

describe('createAuthGuard', () => {
  it('waits for initializeAuth before evaluating a protected route', async () => {
    let finishInitialization!: () => void
    const initialization = new Promise<void>((resolve) => {
      finishInitialization = resolve
    })
    const store = createStore({
      authReady: false,
      initializeAuth: vi.fn<() => Promise<void>>(() => initialization),
    })
    const guardResult = createAuthGuard(asGuardStore(store))(
      createRoute('/dashboard', { requiresAuth: true, roles: ['STUDENT'] }),
    )
    const settled = vi.fn<(value: Awaited<typeof guardResult>) => void>()
    void guardResult.then(settled)

    await Promise.resolve()

    expect(store.initializeAuth).toHaveBeenCalledOnce()
    expect(settled).not.toHaveBeenCalled()

    store.authReady = true
    store.isAuthenticated = true
    store.userRole = 'STUDENT'
    finishInitialization()

    await expect(guardResult).resolves.toBe(true)
  })

  it('allows a valid authenticated password recovery session', async () => {
    const store = createStore({
      isAuthenticated: true,
      isPasswordRecovery: true,
      userRole: 'STUDENT',
    })

    await expect(
      createAuthGuard(asGuardStore(store))(createRoute('/reset-password', { recoveryOnly: true })),
    ).resolves.toBe(true)
  })

  it('redirects an invalid password recovery session to login', async () => {
    const store = createStore()

    await expect(
      createAuthGuard(asGuardStore(store))(createRoute('/reset-password', { recoveryOnly: true })),
    ).resolves.toEqual({ name: 'login', query: { recovery: 'invalid' } })
  })

  it('redirects a normal authenticated session away from the recovery page', async () => {
    const store = createStore({ isAuthenticated: true, userRole: 'ORGANISER' })

    await expect(
      createAuthGuard(asGuardStore(store))(createRoute('/reset-password', { recoveryOnly: true })),
    ).resolves.toBe('/organiser/dashboard')
  })

  it('redirects an unauthenticated user to login and preserves the requested URL', async () => {
    const store = createStore()
    const guard = createAuthGuard(asGuardStore(store))

    await expect(
      guard(createRoute('/admin?tab=users', { requiresAuth: true, roles: ['ADMIN'] })),
    ).resolves.toEqual({
      name: 'login',
      query: { redirect: '/admin?tab=users' },
    })
    expect(store.initializeAuth).not.toHaveBeenCalled()
  })

  it('allows an authenticated user whose role is permitted', async () => {
    const store = createStore({
      isAuthenticated: true,
      userRole: 'ORGANISER',
    })
    const guard = createAuthGuard(asGuardStore(store))

    await expect(
      guard(
        createRoute('/organiser/dashboard', {
          requiresAuth: true,
          roles: ['ORGANISER'],
        }),
      ),
    ).resolves.toBe(true)
  })

  it.each([
    ['STUDENT', ['ADMIN'], '/dashboard'],
    ['ORGANISER', ['STUDENT'], '/organiser/dashboard'],
    ['ADMIN', ['ORGANISER'], '/admin'],
  ] satisfies Array<[UserRole, UserRole[], string]>)(
    'redirects an authenticated %s away from a forbidden route to their home',
    async (role, roles, home) => {
      const store = createStore({
        isAuthenticated: true,
        userRole: role,
      })
      const guard = createAuthGuard(asGuardStore(store))

      await expect(guard(createRoute('/forbidden', { requiresAuth: true, roles }))).resolves.toBe(
        home,
      )
    },
  )

  it.each([
    ['STUDENT', '/dashboard'],
    ['ORGANISER', '/organiser/dashboard'],
    ['ADMIN', '/admin'],
  ] satisfies Array<[UserRole, string]>)(
    'redirects an authenticated %s away from a guest-only route',
    async (role, home) => {
      const store = createStore({
        isAuthenticated: true,
        userRole: role,
      })
      const guard = createAuthGuard(asGuardStore(store))

      await expect(guard(createRoute('/login', { guestOnly: true }))).resolves.toBe(home)
    },
  )
})
