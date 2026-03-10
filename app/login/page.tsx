'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    window.location.href = '/intake'
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0A0A0F',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ fontFamily: 'serif', fontSize: '20px', color: '#4DFFA0', letterSpacing: '0.1em' }}>OA</div>
        <h1 style={{ fontSize: '36px', color: '#E8E8F0', lineHeight: 1.1 }}>
          {mode === 'login' ? 'Welcome back.' : 'Get started.'}
        </h1>
        <p style={{ fontSize: '14px', color: '#6B6B8A' }}>
          {mode === 'login' ? 'Sign in to your workspace.' : 'Create your account to begin.'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            style={{ width: '100%', padding: '12px 16px', background: '#111118', border: '1px solid #2A2A38', borderRadius: '6px', color: '#E8E8F0', fontSize: '14px', outline: 'none' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            style={{ width: '100%', padding: '12px 16px', background: '#111118', border: '1px solid #2A2A38', borderRadius: '6px', color: '#E8E8F0', fontSize: '14px', outline: 'none' }}
          />
        </div>
        {error && (
          <p style={{ fontSize: '13px', color: '#FF4D6A', padding: '10px 14px', background: 'rgba(255,77,106,0.08)', border: '1px solid #FF4D6A', borderRadius: '4px' }}>
            {error}
          </p>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading || !email || !password}
          style={{ padding: '12px', background: '#4DFFA0', color: '#0A0A0F', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
        <button
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
          style={{ background: 'none', border: 'none', color: '#6B6B8A', fontSize: '13px', cursor: 'pointer', textAlign: 'center' }}
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
