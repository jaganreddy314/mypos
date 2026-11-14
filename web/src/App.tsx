import { isConfigured } from './lib/supabase'
import { useSettings } from './lib/settings'
import { Setup } from './till/Setup'
import { Till } from './till/Till'
import { Notice } from './till/ui'

export default function App() {
  const settings = useSettings()
  if (!isConfigured) {
    return (
      <Notice title="Not connected yet">
        Copy <code>.env.example</code> to <code>.env</code> and fill in the store app's Supabase address and anon key, then build again.
      </Notice>
    )
  }
  // Once the iPad is set up the till opens straight away, signed in or not, online or not.
  if (!settings) return <Setup />
  return <Till settings={settings} />
}
