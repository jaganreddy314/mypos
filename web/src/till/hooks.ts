import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

/** A short message at the bottom of the screen that clears itself after 2.2 seconds. */
export function useToast() {
  const [text, setText] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const say = useCallback((t: string) => {
    setText(t)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setText(''), 2200)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  return { text, say }
}

/** The till's clock, refreshed every 20 seconds. */
export function useNow(every = 20_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), every)
    return () => clearInterval(t)
  }, [every])
  return now
}

/** Who is signed in: undefined while it's being checked, null when nobody is. */
export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return session
}

/** Light or dark, as the store app does: the device setting until someone picks one here. */
export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? '')
  const isDark = theme ? theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  const toggle = () => {
    const next = isDark ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('theme', next) } catch { /* private mode */ }
    setTheme(next)
  }
  return { isDark, toggle }
}
