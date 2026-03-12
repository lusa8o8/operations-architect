'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const WAVE1_QUESTIONS = [
  { key: 'org_goal', text: 'What is the main outcome your organization is trying to produce?', placeholder: 'e.g. Help students improve their grades, grow our client base, deliver products faster...' },
  { key: 'primary_customer', text: 'Who receives the value your organization produces?', placeholder: 'e.g. Secondary school students, small business owners, hospitals...' },
  { key: 'value_delivery', text: 'What does your organization provide to them?', placeholder: 'e.g. Tutoring sessions, consulting, software tools, logistics...' },
  { key: 'value_moment', text: 'When does someone decide to use your service?', placeholder: 'e.g. When they fail an exam, when they need a website, when they have too much stock...' },
  { key: 'value_journey', text: 'What usually happens between discovering you and receiving value?', placeholder: 'e.g. They see our ad → book a call → we assess their needs → they sign up → we start work' },
  { key: 'team_roles', text: 'What roles currently exist in the organization?', placeholder: 'e.g. CEO, tutors, sales team, admin, content creators...' },
  { key: 'bottleneck', text: 'Where does work usually slow down or become chaotic?', placeholder: 'e.g. Scheduling is a mess, we lose leads after first contact, delivery takes too long...' },
]

type DiscoveryQuestion = {
  id: string
  question_text: string
  question_type: string
  generated_reason: string
  priority: number
}

type Phase = 'org_name' | 'wave1' | 'loading_discovery' | 'wave2' | 'complete'

export default function IntakePage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('org_name')
  const [orgName, setOrgName] = useState('')
  const [savingOrgName, setSavingOrgName] = useState(false)
  const [current, setCurrent] = useState(0)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [discoveryQuestions, setDiscoveryQuestions] = useState<DiscoveryQuestion[]>([])
  const [discoveryIndex, setDiscoveryIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/intake/session', { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d.sessionId) {
          setSessionId(d.sessionId)
          setOrgId(d.orgId)
        } else {
          setError('Could not start session. Are you logged in?')
        }
      })
      .catch(() => setError('Network error.'))
  }, [])

  async function saveOrgName() {
    if (!orgName.trim() || !orgId) return
    setSavingOrgName(true)
    const supabase = createClient()
    await supabase
      .from('organizations')
      .update({ name: orgName.trim() })
      .eq('id', orgId)
    setSavingOrgName(false)
    setPhase('wave1')
  }

  async function saveWave1AndAdvance() {
    if (!draft.trim() || !sessionId) return
    setSaving(true)
    const q = WAVE1_QUESTIONS[current]
    await fetch('/api/intake/response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, questionKey: q.key, responseText: draft.trim() }),
    })
    setSaving(false)
    setDraft('')

    if (current + 1 < WAVE1_QUESTIONS.length) {
      setCurrent(current + 1)
    } else {
      setPhase('loading_discovery')
      await fetch('/api/intake/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const res = await fetch('/api/intake/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json()
      if (data.questions && data.questions.length > 0) {
        setDiscoveryQuestions(data.questions)
        setDiscoveryIndex(0)
        setPhase('wave2')
      } else {
        setPhase('complete')
      }
    }
  }

  async function saveDiscoveryAndAdvance() {
    if (!draft.trim()) return
    setSaving(true)
    const q = discoveryQuestions[discoveryIndex]
    await fetch('/api/intake/discover/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: q.id, responseText: draft.trim() }),
    })
    setSaving(false)
    setDraft('')
    if (discoveryIndex + 1 < discoveryQuestions.length) {
      setDiscoveryIndex(discoveryIndex + 1)
    } else {
      setPhase('complete')
    }
  }

  const s = {
    minHeight: '100vh',
    backgroundColor: '#0A0A0F',
    color: '#E8E8F0',
    fontFamily: 'monospace',
    padding: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
  const card = { maxWidth: '640px', width: '100%' }

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

  if (phase === 'org_name') return (
    <div style={s}><div style={card}>
      <span style={{ color: '#4DFFA0', fontSize: '14px' }}>OA</span>
      <h1 style={{ fontSize: '24px', margin: '24px 0 8px', fontFamily: 'serif', fontWeight: 400 }}>Let's start with the basics.</h1>
      <p style={{ color: '#6B6B8A', fontSize: '14px', marginBottom: '40px' }}>What is your organization called?</p>
      <input
        value={orgName}
        onChange={e => setOrgName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && saveOrgName()}
        placeholder="e.g. Transcended Study Hub, Acme Corp, Studio Neon..."
        autoFocus
        style={{ width: '100%', backgroundColor: '#12121E', border: '1px solid #2A2A38', borderRadius: '6px', color: '#E8E8F0', padding: '16px', fontSize: '16px', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', marginBottom: '16px' }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={saveOrgName}
          disabled={!orgName.trim() || savingOrgName}
          style={{ padding: '12px 24px', background: orgName.trim() ? '#4DFFA0' : '#1A1A2E', color: orgName.trim() ? '#0A0A0F' : '#6B6B8A', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: orgName.trim() ? 'pointer' : 'not-allowed' }}
        >
          {savingOrgName ? 'Saving...' : 'Continue →'}
        </button>
      </div>
    </div></div>
  )

  if (phase === 'loading_discovery') return (
    <div style={s}><div style={card}>
      <span style={{ color: '#4DFFA0', fontSize: '14px' }}>OA</span>
      <h2 style={{ fontSize: '20px', margin: '24px 0 8px', fontFamily: 'serif', fontWeight: 400 }}>Analysing your organization...</h2>
      <p style={{ color: '#6B6B8A', fontSize: '14px' }}>The system is identifying gaps in your operational model. This takes about 15 seconds.</p>
    </div></div>
  )

  if (phase === 'complete') return (
    <div style={s}><div style={card}>
      <span style={{ color: '#4DFFA0', fontSize: '14px' }}>OA</span>
      <h1 style={{ fontSize: '24px', margin: '24px 0 8px' }}>Intake complete.</h1>
      <p style={{ color: '#6B6B8A', fontSize: '14px', marginBottom: '32px' }}>Your operational model has been built. Review it before it locks.</p>
      <button
        onClick={() => window.location.href = '/intake/review'}
        style={{ padding: '12px 24px', background: '#4DFFA0', color: '#0A0A0F', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
      >
        Review model →
      </button>
    </div></div>
  )

  if (phase === 'wave2') {
    const q = discoveryQuestions[discoveryIndex]
    const progress = (discoveryIndex / discoveryQuestions.length) * 100
    return (
      <div style={s}><div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <span style={{ color: '#4DFFA0', fontSize: '14px' }}>OA</span>
          <span style={{ color: '#6B6B8A', fontSize: '12px' }}>{discoveryIndex + 1} / {discoveryQuestions.length}</span>
        </div>
        <div style={{ height: '2px', backgroundColor: '#1A1A2E', marginBottom: '40px', borderRadius: '1px' }}>
          <div style={{ height: '100%', width: `${progress}%`, backgroundColor: '#4DFFA0', borderRadius: '1px', transition: 'width 0.3s ease' }} />
        </div>
        <p style={{ color: '#6B6B8A', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Refining your model</p>
        <h2 style={{ fontSize: '20px', lineHeight: '1.5', marginBottom: '12px', fontFamily: 'serif', fontWeight: 400 }}>{q.question_text}</h2>
        <p style={{ color: '#4DFFA0', fontSize: '12px', marginBottom: '24px' }}>Why this matters: {q.generated_reason}</p>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Be honest — vague answers are fine. The system will handle uncertainty."
          rows={4}
          style={{ width: '100%', backgroundColor: '#12121E', border: '1px solid #2A2A38', borderRadius: '6px', color: '#E8E8F0', padding: '16px', fontSize: '14px', fontFamily: 'monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <button
            onClick={async () => {
              setDraft("I don't know")
              await new Promise(r => setTimeout(r, 100))
              await saveDiscoveryAndAdvance()
            }}
            style={{ background: 'none', border: 'none', color: '#6B6B8A', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
          >
            I don't know
          </button>
          <button
            onClick={saveDiscoveryAndAdvance}
            disabled={!draft.trim() || saving}
            style={{ padding: '12px 24px', background: draft.trim() ? '#4DFFA0' : '#1A1A2E', color: draft.trim() ? '#0A0A0F' : '#6B6B8A', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: draft.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
          >
            {saving ? 'Saving...' : discoveryIndex + 1 === discoveryQuestions.length ? 'Complete →' : 'Next →'}
          </button>
        </div>
      </div></div>
    )
  }

  const q = WAVE1_QUESTIONS[current]
  const progress = (current / WAVE1_QUESTIONS.length) * 100

  return (
    <div style={s}><div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
        <span style={{ color: '#4DFFA0', fontSize: '14px' }}>OA</span>
        <span style={{ color: '#6B6B8A', fontSize: '12px' }}>{current + 1} / {WAVE1_QUESTIONS.length}</span>
      </div>
      <div style={{ height: '2px', backgroundColor: '#1A1A2E', marginBottom: '48px', borderRadius: '1px' }}>
        <div style={{ height: '100%', width: `${progress}%`, backgroundColor: '#4DFFA0', borderRadius: '1px', transition: 'width 0.3s ease' }} />
      </div>
      <p style={{ color: '#6B6B8A', fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px' }}>Question {current + 1}</p>
      <h2 style={{ fontSize: '20px', lineHeight: '1.5', marginBottom: '8px', fontFamily: 'serif', fontWeight: 400 }}>{q.text}</h2>
      <p style={{ color: '#4DFFA0', fontSize: '12px', marginBottom: '24px' }}>{q.placeholder}</p>
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder="Type your answer... honesty matters more than precision"
        rows={4}
        style={{ width: '100%', backgroundColor: '#12121E', border: '1px solid #2A2A38', borderRadius: '6px', color: '#E8E8F0', padding: '16px', fontSize: '14px', fontFamily: 'monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
        onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) saveWave1AndAdvance() }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
        <button
          onClick={saveWave1AndAdvance}
          disabled={!draft.trim() || saving}
          style={{ padding: '12px 24px', background: draft.trim() ? '#4DFFA0' : '#1A1A2E', color: draft.trim() ? '#0A0A0F' : '#6B6B8A', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: draft.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
        >
          {saving ? 'Saving...' : 'Next →'}
        </button>
      </div>
    </div></div>
  )
}
