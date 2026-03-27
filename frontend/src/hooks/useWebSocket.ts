import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuthStore } from '@/store/authStore'

export type WSEvent = {
  type: string
  data: Record<string, any>
}

type EventHandler = (event: WSEvent) => void

const WS_BASE = import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:8000'
const RECONNECT_DELAY_MS = 3000
const MAX_RECONNECT_ATTEMPTS = 10

export function useWebSocket(onEvent?: EventHandler) {
  const { token } = useAuthStore()
  const wsRef = useRef<WebSocket | null>(null)
  const attemptsRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onEventRef = useRef(onEvent)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')

  // Keep onEvent ref fresh without re-triggering effect
  useEffect(() => { onEventRef.current = onEvent }, [onEvent])

  const connect = useCallback(() => {
    if (!token) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setStatus('connecting')
    const url = `${WS_BASE}/ws?token=${token}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      attemptsRef.current = 0
      setStatus('connected')
    }

    ws.onmessage = (event) => {
      try {
        const parsed: WSEvent = JSON.parse(event.data)
        if (parsed.type === 'ping') {
          ws.send('ping')
          return
        }
        onEventRef.current?.(parsed)
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      setStatus('disconnected')
      wsRef.current = null
      scheduleReconnect()
    }

    ws.onerror = () => {
      setStatus('error')
      ws.close()
    }
  }, [token])

  const scheduleReconnect = useCallback(() => {
    if (attemptsRef.current >= MAX_RECONNECT_ATTEMPTS) return
    attemptsRef.current++
    const delay = Math.min(RECONNECT_DELAY_MS * attemptsRef.current, 30_000)
    reconnectTimerRef.current = setTimeout(connect, delay)
  }, [connect])

  useEffect(() => {
    connect()
    return () => {
      reconnectTimerRef.current && clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { status, ws: wsRef.current }
}


// ── Typed event hooks ─────────────────────────────────────────────────────────

export function useAlertEvents(onAlert: (data: any) => void) {
  const handler = useCallback((event: WSEvent) => {
    if (event.type === 'alert.created' || event.type === 'alert.updated' || event.type === 'alert.critical') {
      onAlert({ ...event.data, _eventType: event.type })
    }
  }, [onAlert])
  return useWebSocket(handler)
}

export function usePlaybookEvents(onPlaybook: (event: WSEvent) => void) {
  const handler = useCallback((event: WSEvent) => {
    if (event.type.startsWith('playbook.')) {
      onPlaybook(event)
    }
  }, [onPlaybook])
  return useWebSocket(handler)
}

export function useSystemStats(onStats: (data: any) => void) {
  const handler = useCallback((event: WSEvent) => {
    if (event.type === 'system.stats') {
      onStats(event.data)
    }
  }, [onStats])
  return useWebSocket(handler)
}
