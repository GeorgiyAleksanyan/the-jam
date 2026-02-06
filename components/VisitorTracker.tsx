'use client'

import { useEffect, useRef } from 'react'

/**
 * Tracks a single visit per session
 * Uses sessionStorage to avoid double-counting
 */
export default function VisitorTracker() {
  const tracked = useRef(false)

  useEffect(() => {
    // Only track once per session
    if (tracked.current) return
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem('jam_visited')) return

    tracked.current = true
    sessionStorage.setItem('jam_visited', '1')

    // Fire and forget - don't block rendering
    fetch('/api/track', { method: 'POST' }).catch(() => {
      // Silently fail - tracking is non-critical
    })
  }, [])

  return null
}
