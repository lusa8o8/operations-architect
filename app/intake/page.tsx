'use client'

import { useEffect, useState } from 'react'

const QUESTIONS = [
  { key: 'org_goal', text: 'What is the main outcome your organization is trying to produce?' },
  { key: 'primary_customer', text: 'Who receives the value your organization produces?' },
  { key: 'value_delivery', text: 'What does your organization provide to them?' },
  { key: 'value_moment', text: 'When does someone decide to use your service?' },
  { key: 'value_journey', text: 'What usually happens between discovering you and receiving value?' },
  { key: 'team_roles', text: 'What roles currently exist in the organization?' },
  { key: 'bottleneck', text: 'Where does work usually slow down or become chaotic?' },
]

export default function IntakePage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/intake/session', { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d.sessionId) setSessionId(d.sessionId)
        else setError('Could not start session. Are you logged in?')
      })
      .catch(() => setError('Network error. Is the server running?'))
  }, [])

  async function saveAndAdvance() {
    if (!draft.trim() || !sessionId) return
    setSaving(true)
    const q = QUESTIONS[current]
    await fetch('/api/intake/response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, questionKey: q.key, responseText: draft.trim() }),
    })
    setAnswers(prev => ({ ...prev, [q.key]: draft.trim() }))
    setSaving(false)
    setDraft('')
    if (current + 1 < QUESTIONS.length) {
      setCurrent(current + 1)
    } else {
      await fetch('/api/intake/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      setDone(true)
    }
  }

  const s = { minHeight: '100vh', backgroundColor: '#0A0A0F', color: '#E8E8F0', fontFamily: 'monospace', padding: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  const card = { maxWidth: '600px', width: '100%' }

  if (error) return (
    <div style={s}><div style={card}>
      <p style={{ color: '#FF6B6B' }}>{error}</p>
      <a href="/dashboard" style={{ color: '#4DFFA0', fontSize: '13px' }}>← Back to dashboard</a>
    </div></div>
  )

  if (!sessionId) return (
    <div style={s}><div style={card}>
      <p style={{ color: '#6B6B8A', fontSize: '14px' }}>Starting session...</p>
    </div></div>
  )

  if (done) return (
    <div style={s}><div style={card}>
      <span style={{ color: '#4DFFA0', fontSize: '14px', letterSpacing: '0.1em' }}>OA</span>
      <h1 style={{ fontSize: '24px', margin: '24px 0 8px' }}>Wave 1 complete.</h1>
      <p style={{ color: '#6B6B8A', fontSize: '14px', marginBottom: '32px' }}>Your responses have been saved. The system is ready to build your operational model.</p>
      <button
        onClick={() => window.location.href = '/dashboard'}
        style={{ padding: '12px 24px', background: '#4DFFA0', color: '#0A0A0F', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
      >
        Back to dashboard →
      </button>
    </div></div>
  )

  const q = QUESTIONS[current]
  const progress = ((current) / QUESTIONS.length) * 100

  return (
    <div style={s}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
          <span style={{ color: '#4DFFA0', fontSize: '14px', letterSpacing: '0.1em' }}>OA</span>
          <span style={{ color: '#6B6B8A', fontSize: '12px' }}>{current + 1} / {QUESTIONS.length}</span>
        </div>
        <div style={{ height: '2px', backgroundColor: '#1A1A2E', marginBottom: '48px', borderRadius: '1px' }}>
          <div style={{ height: '100%', width: `${progress}%`, backgroundColor: '#4DFFA0', borderRadius: '1px', transition: 'width 0.3s ease' }} />
        </div>
        <p style={{ color: '#6B6B8A', fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px' }}>Question {current + 1}</p>
        <h2 style={{ fontSize: '20px', lineHeight: '1.5', marginBottom: '32px', fontFamily: 'serif', fontWeight: 400 }}>{q.text}</h2>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Type your answer..."
          rows={4}
          style={{ width: '100%', backgroundColor: '#12121E', border: '1px solid #2A2A38', borderRadius: '6px', color: '#E8E8F0', padding: '16px', fontSize: '14px', fontFamily: 'monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) saveAndAdvance() }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button
            onClick={saveAndAdvance}
            disabled={!draft.trim() || saving}
            style={{ padding: '12px 24px', background: draft.trim() ? '#4DFFA0' : '#1A1A2E', color: draft.trim() ? '#0A0A0F' : '#6B6B8A', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: draft.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
          >
            {saving ? 'Saving...' : current + 1 === QUESTIONS.length ? 'Complete →' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
