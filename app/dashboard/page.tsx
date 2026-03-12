'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ModelSummary = {
  version: number
  confidence_score: number
  created_at: string
  model_graph: {
    north_star: string
    primary_customer: string
    stages: any[]
    roles: any[]
    triggers: any[]
    bottlenecks: any[]
    confidence_score: number
  }
}

type OrgSummary = {
  id: string
  name: string
  industry: string | null
  north_star: string | null
}

export default function DashboardPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [org, setOrg] = useState<OrgSummary | null>(null)
  const [model, setModel] = useState<ModelSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { window.location.href = '/login'; return }
      setEmail(data.user.email ?? null)

      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name, industry, north_star')
        .eq('owner_id', data.user.id)
        .limit(1)

      const userOrg = orgs?.[0] ?? null
      setOrg(userOrg)

      if (userOrg) {
        const { data: models } = await supabase
          .from('operational_models')
          .select('version, confidence_score, created_at, model_graph')
          .eq('org_id', userOrg.id)
          .order('version', { ascending: false })
          .limit(1)

        setModel(models?.[0] ?? null)
      }

      setLoading(false)
    })
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const s = {
    minHeight: '100vh',
    backgroundColor: '#0A0A0F',
    color: '#E8E8F0',
    fontFamily: 'monospace',
  }

  const confidenceColor = (c: number) => c >= 0.85 ? '#4DFFA0' : c >= 0.65 ? '#FFB844' : '#FF6B6B'

  if (loading) return (
    <div style={{ ...s, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B6B8A', fontSize: '14px' }}>Loading...</p>
    </div>
  )

  const graph = model?.model_graph
  const northStar = graph?.north_star ?? org?.north_star ?? null
  const confidence = graph?.confidence_score ?? model?.confidence_score ?? 0
  const lastUpdated = model?.created_at
    ? new Date(model.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <div style={s}>
      <div style={{ borderBottom: '1px solid #1A1A2E', padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#4DFFA0', fontSize: '14px', fontWeight: 600 }}>OA</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={{ color: '#6B6B8A', fontSize: '13px' }}>{email}</span>
          <button onClick={signOut} style={{ background: 'none', border: 'none', color: '#6B6B8A', fontSize: '13px', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '64px 48px' }}>

        {!org && (
          <div>
            <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>Welcome.</h1>
            <p style={{ color: '#6B6B8A', fontSize: '14px', marginBottom: '40px' }}>
              You have not mapped your organization yet. Start intake to build your operational model.
            </p>
            <button
              onClick={() => window.location.href = '/intake'}
              style={{ padding: '14px 28px', background: '#4DFFA0', color: '#0A0A0F', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
            >
              Start intake →
            </button>
          </div>
        )}

        {org && !model && (
          <div>
            <p style={{ color: '#6B6B8A', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>Your organization</p>
            <h1 style={{ fontSize: '28px', marginBottom: '32px', fontFamily: 'serif', fontWeight: 400 }}>
              {northStar ?? 'Unnamed organization'}
            </h1>
            <p style={{ color: '#6B6B8A', fontSize: '14px', marginBottom: '40px' }}>
              Intake is in progress. Complete the intake flow to build your operational model.
            </p>
            <button
              onClick={() => window.location.href = '/intake'}
              style={{ padding: '14px 28px', background: '#4DFFA0', color: '#0A0A0F', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
            >
              Continue intake →
            </button>
          </div>
        )}

        {org && model && graph && (
          <div>
            <div style={{ marginBottom: '48px' }}>
              <p style={{ color: '#6B6B8A', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>Your organization</p>
              <h1 style={{ fontSize: '28px', lineHeight: '1.4', fontFamily: 'serif', fontWeight: 400, marginBottom: '8px' }}>
                {northStar}
              </h1>
              <p style={{ color: '#6B6B8A', fontSize: '14px', marginBottom: '16px' }}>
                For <span style={{ color: '#E8E8F0' }}>{graph.primary_customer}</span>
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 12px', border: `1px solid ${confidenceColor(confidence)}44`, borderRadius: '20px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: confidenceColor(confidence) }} />
                  <span style={{ fontSize: '12px', color: confidenceColor(confidence) }}>{Math.round(confidence * 100)}% confidence</span>
                </div>
                <span style={{ fontSize: '12px', color: '#6B6B8A' }}>v{model.version}</span>
                {lastUpdated && <span style={{ fontSize: '12px', color: '#6B6B8A' }}>Last updated {lastUpdated}</span>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '48px' }}>
              {[
                { label: 'Pipeline stages', value: graph.stages?.length ?? 0 },
                { label: 'Roles', value: graph.roles?.length ?? 0 },
                { label: 'Triggers', value: graph.triggers?.length ?? 0 },
                { label: 'Bottlenecks', value: graph.bottlenecks?.length ?? 0 },
              ].map((stat, i) => (
                <div key={i} style={{ padding: '20px', backgroundColor: '#12121E', border: '1px solid #2A2A38', borderRadius: '8px' }}>
                  <p style={{ fontSize: '28px', fontWeight: 600, color: '#4DFFA0', marginBottom: '6px' }}>{stat.value}</p>
                  <p style={{ fontSize: '12px', color: '#6B6B8A' }}>{stat.label}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => window.location.href = '/dashboard/pipeline'}
                style={{ padding: '14px 28px', background: '#4DFFA0', color: '#0A0A0F', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
              >
                View pipeline →
              </button>
              <button
                onClick={() => window.location.href = '/intake'}
                style={{ padding: '14px 28px', background: 'none', border: '1px solid #2A2A38', color: '#6B6B8A', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
              >
                Refine model
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
