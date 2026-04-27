'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/store/themeStore'
import { useEmpresaStore } from '@/store/empresaStore'
import { useDateRangeStore } from '@/store/dateRangeStore'

/**
 * Trigger Zustand persist rehydration for all stores AFTER React has
 * finished hydrating the SSR HTML. All persisted stores are configured
 * with `skipHydration: true` for this reason — otherwise the middleware
 * would read localStorage during the first client render and produce
 * a tree that doesn't match the SSR HTML, triggering React errors
 * #418/#425/#423 ("text content did not match", "hydration failed",
 * "error during hydration → switch to client rendering").
 *
 * The inline boot script in app/layout.tsx still applies the `dark`
 * class on <html> before first paint, so the user never sees a flash
 * of the wrong theme on hard reload.
 */
export function ThemeHydrator() {
  useEffect(() => {
    useThemeStore.persist.rehydrate()
    useEmpresaStore.persist.rehydrate()
    useDateRangeStore.persist.rehydrate()
  }, [])
  return null
}
