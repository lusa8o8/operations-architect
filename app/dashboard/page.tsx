'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0A0A0F',
      color: '#E8E8F0',
      fontFamily: 'monospace',
      padding: '48px',
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
          <span style={{ color: '#4DFFA0', fontSize: '16px', letterSpacing: '0.1em' }}>OA</span>
          <button
            onClick={handleSignOut}
            style={{ background: 'none', border: '1px solid #2A2A38', color: '#6B6B8A', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
          >
            Sign out
          </button>
        </div>
        <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Dashboard</h1>
        <p style={{ color: '#6B6B8A', fontSize: '14px', marginBottom: '48px' }}>{email}</p>
        <div style={{ border: '1px solid #2A2A38', borderRadius: '8px', padding: '32px', textAlign: 'center' }}>
          <p style={{ color: '#6B6B8A', marginBottom: '24px', fontSize: '14px' }}>No operational model yet.</p>
          <button
            onClick={() => window.location.href = '/intake'}
            style={{ padding: '12px 24px', background: '#4DFFA0', color: '#0A0A0F', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
          >
            Start intake →
          </button>
        </div>
      </div>
    </div>
  )
}
