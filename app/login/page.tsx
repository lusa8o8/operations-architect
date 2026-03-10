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

    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    window.location.href = '/intake'
  }

  return (
    <div className='auth-shell'>
      <div className='auth-card animate-in'>
        <div className='auth-logo'>OA</div>
        <h1 className='auth-title'>
          {mode === 'login' ? 'Welcome back.' : 'Get started.'}
        </h1>
        <p className='auth-sub'>
          {mode === 'login'
            ? 'Sign in to your workspace.'
            : 'Create your account to begin.'}
        </p>

        <div className='auth-fields'>
          <input
            className='auth-input'
            type='email'
            placeholder='Email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <input
            className='auth-input'
            type='password'
            placeholder='Password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {error && <p className='auth-error'>{error}</p>}

        <button
          className='auth-btn'
          onClick={handleSubmit}
          disabled={loading || !email || !password}
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign in →' : 'Create account →'}
        </button>

        <button
          className='auth-toggle'
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
        >
          {mode === 'login' ? 'Don''t have an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </div>

      <style jsx>{
        .auth-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          padding: 24px;
        }
        .auth-card {
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .auth-logo {
          font-family: var(--font-display);
          font-size: 20px;
          color: var(--accent);
          letter-spacing: 0.1em;
          margin-bottom: 8px;
        }
        .auth-title {
          font-family: var(--font-display);
          font-size: 36px;
          color: var(--text);
          line-height: 1.1;
        }
        .auth-sub {
          font-size: 14px;
          color: var(--text-muted);
        }
        .auth-fields {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 8px;
        }
        .auth-input {
          width: 100%;
          padding: 12px 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .auth-input:focus { border-color: var(--accent); }
        .auth-input::placeholder { color: var(--text-muted); }
        .auth-error {
          font-size: 13px;
          color: var(--danger);
          padding: 10px 14px;
          background: rgba(255, 77, 106, 0.08);
          border: 1px solid var(--danger);
          border-radius: 4px;
        }
        .auth-btn {
          padding: 12px;
          background: var(--accent);
          color: var(--bg);
          border: none;
          border-radius: 6px;
          font-family: var(--font-mono);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .auth-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .auth-btn:not(:disabled):hover { opacity: 0.85; }
        .auth-toggle {
          background: none;
          border: none;
          color: var(--text-muted);
          font-family: var(--font-mono);
          font-size: 13px;
          cursor: pointer;
          text-align: center;
          transition: color 0.2s;
        }
        .auth-toggle:hover { color: var(--text); }
      }</style>
    </div>
  )
}
