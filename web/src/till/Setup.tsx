// Setting up an iPad as a till: sign in as someone from the store app, then pick the business
// it sells for. Only businesses where that person has the Till area are offered.
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useSession } from './hooks'
import { supabase } from '../lib/supabase'
import { saveSettings } from '../lib/settings'
import { refreshMenu } from '../lib/sync'
import { BusinessTile, Notice } from './ui'

export function Setup() {
  const session = useSession()
  if (session === undefined) return null
  if (!session) {
    return (
      <Notice title="Set up this till">
        <p>Sign in with your store app email and password. The till stays signed in after this.</p>
        <SignInForm />
      </Notice>
    )
  }
  return <ChooseBusiness session={session} />
}

export function SignInForm({ email: fixed }: { email?: string }) {
  const [email, setEmail] = useState(fixed ?? '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    setBusy(false)
    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'That email and password don’t match. Check them, or ask an owner to set your password again.'
        : navigator.onLine ? error.message : 'No connection. Signing in needs the internet.')
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
      <input className="field" type="email" autoComplete="username" placeholder="Email" value={email}
        onChange={(e) => setEmail(e.target.value)} readOnly={!!fixed} required />
      <input className="field" type="password" autoComplete="current-password" placeholder="Password" value={password}
        onChange={(e) => setPassword(e.target.value)} required />
      {error && <div role="alert" className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</div>}
      <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  )
}

interface Place {
  business_id: string
  display_name: string | null
  businesses: { name: string } | null
  security_groups: { perms: string[]; is_owner: boolean } | null
}

function ChooseBusiness({ session }: { session: Session }) {
  const email = session.user.email?.toLowerCase() ?? ''
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    supabase.from('business_users')
      .select('business_id, display_name, businesses(name), security_groups(perms, is_owner)')
      .eq('email', email)
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setPlaces(((data ?? []) as unknown as Place[]).filter((p) => p.security_groups?.is_owner || p.security_groups?.perms.includes('pos')))
      })
  }, [email])

  async function pick(p: Place) {
    setBusy(p.business_id)
    setError('')
    try {
      await refreshMenu(p.business_id)
      saveSettings({
        businessId: p.business_id,
        businessName: p.businesses?.name ?? '',
        device: 'Counter',
        staffName: p.display_name || email.split('@')[0],
        surchargePct: 0,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy('')
    }
  }

  return (
    <Notice title="Which shop is this till for?">
      {places === null && !error && <p>Looking up your access…</p>}
      {places?.length === 0 && (
        <p>
          Your access doesn’t include the Till in any business. An owner can add the <b>Till</b> area to your
          security group in the store app, under People → Access.
        </p>
      )}
      <div className="mt-4 flex flex-col gap-2">
        {places?.map((p) => (
          <button key={p.business_id} type="button" className="btn btn-lg justify-start gap-3 text-ink"
            disabled={!!busy} onClick={() => pick(p)}>
            <BusinessTile name={p.businesses?.name} size={32} />
            <span className="flex-1 text-left">{p.businesses?.name}</span>
            <span className="text-sm font-medium text-accent">{busy === p.business_id ? 'Loading the menu…' : 'Use this till ›'}</span>
          </button>
        ))}
      </div>
      {error && <div role="alert" className="mt-3 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</div>}
      <button type="button" className="btn mt-5 min-h-11 w-full" onClick={() => supabase.auth.signOut()}>
        Sign in as someone else
      </button>
    </Notice>
  )
}
