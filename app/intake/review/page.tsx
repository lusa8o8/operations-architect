'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Stage = { name: string; description: string; order: number }
type Role = { name: string; type: string }
type Trigger = { name: string; description: string }
type Bottleneck = { stage: string; description: string; severity: string }

type ModelGraph = {
  north_star: string
  primary_customer: string
  value_proposition: string
  stages: Stage[]
  roles: Role[]
  triggers: Trigger[]
  bottlenecks: Bottleneck[]
  confidence_score: number
}

export default function ReviewPage() {
  const [model, setModel] = useState<ModelGraph | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [stages, setStages] = useState<Stage[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [triggers, setTriggers] = useState<Trigger[]>([])
  const [editingStage, setEditingStage] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const [removedStages, setRemovedStages] = useState<Stage[]>([])
  const [removedRoles, setRemovedRoles] = useState<Role[]>([])
  const [removedTriggers, setRemovedTriggers] = useState<Trigger[]>([])
  const [newStageName, setNewStageName] = useState('')
  const [newRoleName, setNewRoleName] = useState('')
  const [newTriggerName, setNewTriggerName] = useState('')
  const [showAddStage, setShowAddStage] = useState(false)
  const [showAddRole, setShowAddRole] = useState(false)
  const [showAddTrigger, setShowAddTrigger] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setError('Not logged in'); setLoading(false); return }

      const { data: sessions } = await supabase
        .from('intake_sessions')
        .select('id, org_id, status')
        .order('started_at', { ascending: false })
        .limit(1)

      const session = sessions?.[0]
      if (!session) { setError('No intake session found'); setLoading(false); return }

      setSessionId(session.id)
      setOrgId(session.org_id)

      const { data: models } = await supabase
        .from('operational_models')
        .select('model_graph')
        .eq('org_id', session.org_id)
        .order('created_at', { ascending: false })
        .limit(1)

      const graph = models?.[0]?.model_graph as ModelGraph
      if (!graph) { setError('No model found'); setLoading(false); return }

      setModel(graph)
      setStages(graph.stages?.sort((a, b) => a.order - b.order) ?? [])
      setRoles(graph.roles ?? [])
      setTriggers(graph.triggers ?? [])
      setLoading(false)
    })
  }, [])

  function removeStage(index: number) {
    setRemovedStages(prev => [...prev, stages[index]])
    setStages(prev => prev.filter((_, i) => i !== index))
  }

  function undoRemoveStage() {
    const last = removedStages[removedStages.length - 1]
    if (!last) return
    setStages(prev => [...prev, last].sort((a, b) => a.order - b.order))
    setRemovedStages(prev => prev.slice(0, -1))
  }

  function removeRole(index: number) {
    setRemovedRoles(prev => [...prev, roles[index]])
    setRoles(prev => prev.filter((_, i) => i !== index))
  }

  function undoRemoveRole() {
    const last = removedRoles[removedRoles.length - 1]
    if (!last) return
    setRoles(prev => [...prev, last])
    setRemovedRoles(prev => prev.slice(0, -1))
  }

  function removeTrigger(index: number) {
    setRemovedTriggers(prev => [...prev, triggers[index]])
    setTriggers(prev => prev.filter((_, i) => i !== index))
  }

  function undoRemoveTrigger() {
    const last = removedTriggers[removedTriggers.length - 1]
    if (!last) return
    setTriggers(prev => [...prev, last])
    setRemovedTriggers(prev => prev.slice(0, -1))
  }

  function startEditStage(index: number) {
    setEditingStage(index)
    setEditingText(stages[index].name)
  }

  function saveEditStage(index: number) {
    setStages(prev => prev.map((s, i) => i === index ? { ...s, name: editingText } : s))
    setEditingStage(null)
    setEditingText('')
  }

  function addStage() {
    if (!newStageName.trim()) return
    const newStage: Stage = {
      name: newStageName.trim(),
      description: '',
      order: stages.length + 1
    }
    setStages(prev => [...prev, newStage])
    setNewStageName('')
    setShowAddStage(false)
  }

  function addRole() {
    if (!newRoleName.trim()) return
    setRoles(prev => [...prev, { name: newRoleName.trim(), type: 'human' }])
    setNewRoleName('')
    setShowAddRole(false)
  }

  function addTrigger() {
    if (!newTriggerName.trim()) return
    setTriggers(prev => [...prev, { name: newTriggerName.trim(), description: '' }])
    setNewTriggerName('')
    setShowAddTrigger(false)
  }

  async function handleConfirm() {
    if (!sessionId) return
    setConfirming(true)
    await fetch('/api/intake/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        confirmedStages: stages,
        confirmedRoles: roles,
        confirmedTriggers: triggers,
        rejectedIds: [],
        corrections: {}
      })
    })
    setConfirming(false)
    setConfirmed(true)
  }

  const s = {
    minHeight: '100vh',
    backgroundColor: '#0A0A0F',
    color: '#E8E8F0',
    fontFamily: 'monospace',
    padding: '48px 32px',
  }

  const tag = (color: string, text: string) => (
    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: color + '22', color, border: `1px solid ${color}44` }}>{text}</span>
  )

  if (loading) return <div style={s}><p style={{ color: '#6B6B8A' }}>Loading your model...</p></div>
  if (error) return <div style={s}><p style={{ color: '#FF6B6B' }}>{error}</p><a href="/dashboard" style={{ color: '#4DFFA0', fontSize: '13px' }}>← Back</a></div>

  if (confirmed) return (
    <div style={{ ...s, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
        <span style={{ color: '#4DFFA0', fontSize: '14px' }}>OA</span>
        <h1 style={{ fontSize: '24px', margin: '24px 0 8px' }}>Model confirmed.</h1>
        <p style={{ color: '#6B6B8A', fontSize: '14px', marginBottom: '32px' }}>Your operational pipeline is ready.</p>
        <button
          onClick={() => window.location.href = '/dashboard'}
          style={{ padding: '12px 24px', background: '#4DFFA0', color: '#0A0A0F', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
        >
          View dashboard →
        </button>
      </div>
    </div>
  )

  return (
    <div style={s}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
          <span style={{ color: '#4DFFA0', fontSize: '14px' }}>OA</span>
          <a href="/dashboard" style={{ color: '#6B6B8A', fontSize: '13px', textDecoration: 'none' }}>← Dashboard</a>
        </div>

        <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>Review your model.</h1>
        <p style={{ color: '#6B6B8A', fontSize: '14px', marginBottom: '40px' }}>
          This is what the system understood about your organization. Remove anything wrong, edit what's unclear, then confirm.
        </p>

        <div style={{ marginBottom: '40px', padding: '20px', border: '1px solid #2A2A38', borderRadius: '8px' }}>
          <p style={{ color: '#6B6B8A', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>North Star</p>
          <p style={{ fontSize: '16px', lineHeight: '1.5' }}>{model?.north_star}</p>
        </div>

        {/* Pipeline Stages */}
        <div style={{ marginBottom: '40px' }}>
          <p style={{ color: '#6B6B8A', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px' }}>Pipeline Stages</p>
          {stages.map((stage, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, padding: '12px 16px', backgroundColor: '#12121E', border: '1px solid #2A2A38', borderRadius: '6px' }}>
                <span style={{ color: '#4DFFA0', fontSize: '12px', minWidth: '20px' }}>{i + 1}</span>
                {editingStage === i ? (
                  <input
                    value={editingText}
                    onChange={e => setEditingText(e.target.value)}
                    onBlur={() => saveEditStage(i)}
                    onKeyDown={e => e.key === 'Enter' && saveEditStage(i)}
                    autoFocus
                    style={{ flex: 1, background: 'none', border: 'none', color: '#E8E8F0', fontSize: '14px', fontFamily: 'monospace', outline: 'none' }}
                  />
                ) : (
                  <span style={{ flex: 1, fontSize: '14px' }}>{stage.name}</span>
                )}
                <span style={{ color: '#6B6B8A', fontSize: '12px', cursor: 'pointer' }} onClick={() => startEditStage(i)}>edit</span>
              </div>
              <button onClick={() => removeStage(i)} style={{ background: 'none', border: '1px solid #2A2A38', color: '#6B6B8A', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>✕</button>
            </div>
          ))}
          {removedStages.length > 0 && (
            <button onClick={undoRemoveStage} style={{ background: 'none', border: 'none', color: '#4DFFA0', fontSize: '12px', cursor: 'pointer', marginBottom: '8px' }}>↩ Undo remove "{removedStages[removedStages.length - 1].name}"</button>
          )}
          {showAddStage ? (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <input
                value={newStageName}
                onChange={e => setNewStageName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addStage()}
                placeholder="Stage name..."
                autoFocus
                style={{ flex: 1, backgroundColor: '#12121E', border: '1px solid #4DFFA0', borderRadius: '6px', color: '#E8E8F0', padding: '10px 14px', fontSize: '14px', fontFamily: 'monospace', outline: 'none' }}
              />
              <button onClick={addStage} style={{ padding: '10px 16px', background: '#4DFFA0', color: '#0A0A0F', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Add</button>
              <button onClick={() => setShowAddStage(false)} style={{ padding: '10px 16px', background: 'none', border: '1px solid #2A2A38', color: '#6B6B8A', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setShowAddStage(true)} style={{ background: 'none', border: '1px dashed #2A2A38', color: '#6B6B8A', padding: '10px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', marginTop: '4px', width: '100%' }}>+ Add stage</button>
          )}
          {stages.length === 0 && <p style={{ color: '#FF6B6B', fontSize: '13px', marginTop: '8px' }}>No stages — add at least one before confirming.</p>}
        </div>

        {/* Roles */}
        <div style={{ marginBottom: '40px' }}>
          <p style={{ color: '#6B6B8A', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px' }}>Roles</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
            {roles.map((role, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#12121E', border: '1px solid #2A2A38', borderRadius: '6px' }}>
                <span style={{ fontSize: '13px' }}>{role.name}</span>
                {tag('#6B6B8A', role.type)}
                <span style={{ color: '#6B6B8A', fontSize: '11px', cursor: 'pointer' }} onClick={() => removeRole(i)}>✕</span>
              </div>
            ))}
          </div>
          {removedRoles.length > 0 && (
            <button onClick={undoRemoveRole} style={{ background: 'none', border: 'none', color: '#4DFFA0', fontSize: '12px', cursor: 'pointer', marginBottom: '8px', display: 'block' }}>↩ Undo remove "{removedRoles[removedRoles.length - 1].name}"</button>
          )}
          {showAddRole ? (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <input
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addRole()}
                placeholder="Role name..."
                autoFocus
                style={{ flex: 1, backgroundColor: '#12121E', border: '1px solid #4DFFA0', borderRadius: '6px', color: '#E8E8F0', padding: '10px 14px', fontSize: '14px', fontFamily: 'monospace', outline: 'none' }}
              />
              <button onClick={addRole} style={{ padding: '10px 16px', background: '#4DFFA0', color: '#0A0A0F', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Add</button>
              <button onClick={() => setShowAddRole(false)} style={{ padding: '10px 16px', background: 'none', border: '1px solid #2A2A38', color: '#6B6B8A', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setShowAddRole(true)} style={{ background: 'none', border: '1px dashed #2A2A38', color: '#6B6B8A', padding: '10px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', marginTop: '4px' }}>+ Add role</button>
          )}
        </div>

        {/* Triggers */}
        <div style={{ marginBottom: '40px' }}>
          <p style={{ color: '#6B6B8A', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px' }}>Triggers</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
            {triggers.map((trigger, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: '#12121E', border: '1px solid #2A2A38', borderRadius: '6px' }}>
                <span style={{ color: '#4DFFA0', fontSize: '12px' }}>→</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', marginBottom: '2px' }}>{trigger.name}</p>
                  <p style={{ fontSize: '11px', color: '#6B6B8A' }}>{trigger.description}</p>
                </div>
                <span style={{ color: '#6B6B8A', fontSize: '11px', cursor: 'pointer' }} onClick={() => removeTrigger(i)}>✕</span>
              </div>
            ))}
          </div>
          {removedTriggers.length > 0 && (
            <button onClick={undoRemoveTrigger} style={{ background: 'none', border: 'none', color: '#4DFFA0', fontSize: '12px', cursor: 'pointer', marginBottom: '8px', display: 'block' }}>↩ Undo remove "{removedTriggers[removedTriggers.length - 1].name}"</button>
          )}
          {showAddTrigger ? (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <input
                value={newTriggerName}
                onChange={e => setNewTriggerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTrigger()}
                placeholder="Trigger name..."
                autoFocus
                style={{ flex: 1, backgroundColor: '#12121E', border: '1px solid #4DFFA0', borderRadius: '6px', color: '#E8E8F0', padding: '10px 14px', fontSize: '14px', fontFamily: 'monospace', outline: 'none' }}
              />
              <button onClick={addTrigger} style={{ padding: '10px 16px', background: '#4DFFA0', color: '#0A0A0F', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Add</button>
              <button onClick={() => setShowAddTrigger(false)} style={{ padding: '10px 16px', background: 'none', border: '1px solid #2A2A38', color: '#6B6B8A', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setShowAddTrigger(true)} style={{ background: 'none', border: '1px dashed #2A2A38', color: '#6B6B8A', padding: '10px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', marginTop: '4px' }}>+ Add trigger</button>
          )}
        </div>

        {model?.bottlenecks && model.bottlenecks.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <p style={{ color: '#6B6B8A', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px' }}>Flagged Bottlenecks</p>
            {model.bottlenecks.map((b, i) => (
              <div key={i} style={{ padding: '12px 16px', backgroundColor: '#12121E', border: `1px solid ${b.severity === 'high' ? '#FF6B6B44' : '#FFB84444'}`, borderRadius: '6px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>{b.stage}</span>
                  {tag(b.severity === 'high' ? '#FF6B6B' : '#FFB844', b.severity)}
                </div>
                <p style={{ fontSize: '12px', color: '#6B6B8A' }}>{b.description}</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ borderTop: '1px solid #2A2A38', paddingTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: '#6B6B8A', fontSize: '13px' }}>
            {stages.length} stages · {roles.length} roles · {triggers.length} triggers
          </p>
          <button
            onClick={handleConfirm}
            disabled={confirming || stages.length === 0}
            style={{ padding: '14px 32px', background: stages.length > 0 ? '#4DFFA0' : '#1A1A2E', color: stages.length > 0 ? '#0A0A0F' : '#6B6B8A', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: stages.length > 0 ? 'pointer' : 'not-allowed' }}
          >
            {confirming ? 'Confirming...' : 'This looks right →'}
          </button>
        </div>

      </div>
    </div>
  )
}
