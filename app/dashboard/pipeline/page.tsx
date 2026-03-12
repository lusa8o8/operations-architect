'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Stage = { name: string; description: string; order: number }
type Role = { name: string; type: string }
type Trigger = { name: string; description: string }
type Bottleneck = { stage: string; description: string; severity: 'low' | 'medium' | 'high' }

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

export default function PipelinePage() {
  const [model, setModel] = useState<ModelGraph | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setError('Not logged in'); setLoading(false); return }

      const { data: sessions } = await supabase
        .from('intake_sessions')
        .select('org_id, status')
        .eq('status', 'completed')
        .order('started_at', { ascending: false })
        .limit(1)

      const session = sessions?.[0]
      if (!session) { setError('No confirmed model found. Complete intake first.'); setLoading(false); return }

      const { data: models } = await supabase
        .from('operational_models')
        .select('model_graph, confidence_score')
        .eq('org_id', session.org_id)
        .order('created_at', { ascending: false })
        .limit(1)

      const graph = models?.[0]?.model_graph as ModelGraph
      if (!graph) { setError('No model found.'); setLoading(false); return }

      setModel(graph)
      setLoading(false)
    })
  }, [])

  const severityColor = (s: string) => s === 'high' ? '#FF6B6B' : s === 'medium' ? '#FFB844' : '#6B6B8A'

  const bottleneckForStage = (stageName: string) =>
    model?.bottlenecks?.find(b =>
      b.stage.toLowerCase().includes(stageName.toLowerCase()) ||
      stageName.toLowerCase().includes(b.stage.toLowerCase())
    )

  const rolesForStage = (stageName: string) => {
    if (!model?.roles) return []
    const stages = model.stages ?? []
    const idx = stages.findIndex(s => s.name === stageName)
    if (idx === 0) return model.roles.slice(0, Math.ceil(model.roles.length / 2))
    if (idx === stages.length - 1) return model.roles.slice(Math.ceil(model.roles.length / 2))
    return []
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B6B8A', fontFamily: 'monospace', fontSize: '14px' }}>Loading your pipeline...</p>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#FF6B6B', fontFamily: 'monospace', fontSize: '14px', marginBottom: '16px' }}>{error}</p>
        <a href="/dashboard" style={{ color: '#4DFFA0', fontFamily: 'monospace', fontSize: '13px' }}>← Back to dashboard</a>
      </div>
    </div>
  )

  const stages = model?.stages?.sort((a, b) => a.order - b.order) ?? []
  const confidence = model?.confidence_score ?? 0
  const confidenceLabel = confidence >= 0.85 ? 'High confidence' : confidence >= 0.65 ? 'Moderate confidence' : 'Low confidence — more discovery needed'
  const confidenceColor = confidence >= 0.85 ? '#4DFFA0' : confidence >= 0.65 ? '#FFB844' : '#FF6B6B'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0F', color: '#E8E8F0', fontFamily: 'monospace' }}>

      <div style={{ borderBottom: '1px solid #1A1A2E', padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#4DFFA0', fontSize: '14px', fontWeight: 600 }}>OA</span>
        <a href="/dashboard" style={{ color: '#6B6B8A', fontSize: '13px', textDecoration: 'none' }}>← Dashboard</a>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '64px 48px' }}>

        <div style={{ marginBottom: '16px' }}>
          <p style={{ color: '#6B6B8A', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>North Star</p>
          <h1 style={{ fontSize: '28px', lineHeight: '1.4', fontFamily: 'serif', fontWeight: 400, marginBottom: '8px' }}>
            {model?.north_star}
          </h1>
          <p style={{ color: '#6B6B8A', fontSize: '14px' }}>For <span style={{ color: '#E8E8F0' }}>{model?.primary_customer}</span></p>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', border: `1px solid ${confidenceColor}44`, borderRadius: '20px', marginBottom: '64px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: confidenceColor }} />
          <span style={{ fontSize: '12px', color: confidenceColor }}>{confidenceLabel}</span>
          <span style={{ fontSize: '12px', color: '#6B6B8A' }}>{Math.round(confidence * 100)}%</span>
        </div>

        <div style={{ marginBottom: '48px' }}>
          <p style={{ color: '#6B6B8A', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px' }}>What starts your pipeline</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {model?.triggers?.map((trigger, i) => (
              <div key={i} style={{ padding: '8px 16px', backgroundColor: '#12121E', border: '1px solid #2A2A38', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#4DFFA0', fontSize: '12px' }}>→</span>
                <span style={{ fontSize: '13px' }}>{trigger.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '64px' }}>
          <p style={{ color: '#6B6B8A', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '24px' }}>How value flows</p>

          {stages.map((stage, i) => {
            const bottleneck = bottleneckForStage(stage.name)
            const roles = rolesForStage(stage.name)
            const isLast = i === stages.length - 1

            return (
              <div key={i}>
                <div style={{
                  padding: '24px',
                  backgroundColor: '#12121E',
                  border: `1px solid ${bottleneck ? severityColor(bottleneck.severity) + '66' : '#2A2A38'}`,
                  borderRadius: '8px',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: bottleneck || roles.length > 0 ? '16px' : '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ color: '#4DFFA0', fontSize: '13px', minWidth: '24px' }}>0{i + 1}</span>
                      <div>
                        <h3 style={{ fontSize: '16px', marginBottom: '4px', fontWeight: 500 }}>{stage.name}</h3>
                        {stage.description && (
                          <p style={{ fontSize: '13px', color: '#6B6B8A', lineHeight: '1.5' }}>{stage.description}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {bottleneck && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 14px', backgroundColor: severityColor(bottleneck.severity) + '11', border: `1px solid ${severityColor(bottleneck.severity)}33`, borderRadius: '6px', marginBottom: roles.length > 0 ? '12px' : '0' }}>
                      <span style={{ color: severityColor(bottleneck.severity), fontSize: '12px', marginTop: '1px' }}>⚠</span>
                      <div>
                        <span style={{ fontSize: '11px', color: severityColor(bottleneck.severity), textTransform: 'uppercase', letterSpacing: '0.1em' }}>{bottleneck.severity} bottleneck</span>
                        <p style={{ fontSize: '12px', color: '#A8A8C0', marginTop: '2px' }}>{bottleneck.description}</p>
                      </div>
                    </div>
                  )}

                  {roles.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {roles.map((role, j) => (
                        <span key={j} style={{ fontSize: '11px', padding: '3px 10px', backgroundColor: '#1A1A2E', border: '1px solid #2A2A38', borderRadius: '12px', color: '#A8A8C0' }}>
                          {role.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {!isLast && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <div style={{ width: '1px', height: '16px', backgroundColor: '#2A2A38' }} />
                      <span style={{ color: '#2A2A38', fontSize: '12px' }}>▼</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ marginBottom: '64px' }}>
          <p style={{ color: '#6B6B8A', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px' }}>Who runs this</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {model?.roles?.map((role, i) => (
              <div key={i} style={{ padding: '8px 16px', backgroundColor: '#12121E', border: '1px solid #2A2A38', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px' }}>{role.name}</span>
                <span style={{ fontSize: '11px', color: '#6B6B8A', padding: '1px 6px', backgroundColor: '#1A1A2E', borderRadius: '4px' }}>{role.type}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid #1A1A2E', paddingTop: '32px', display: 'flex', gap: '48px' }}>
          {[
            { label: 'Stages', value: stages.length },
            { label: 'Roles', value: model?.roles?.length ?? 0 },
            { label: 'Triggers', value: model?.triggers?.length ?? 0 },
            { label: 'Bottlenecks', value: model?.bottlenecks?.length ?? 0 },
          ].map((stat, i) => (
            <div key={i}>
              <p style={{ fontSize: '24px', fontWeight: 600, color: '#4DFFA0', marginBottom: '4px' }}>{stat.value}</p>
              <p style={{ fontSize: '12px', color: '#6B6B8A' }}>{stat.label}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
