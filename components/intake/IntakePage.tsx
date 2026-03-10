'use client'

import { useState } from 'react'
import { Wave1Form } from './Wave1Form'
import { PipelineSketch } from './PipelineSketch'
import { DiscoveryForm } from './DiscoveryForm'
import { InferenceConfirm } from './InferenceConfirm'
import { ParsingState } from './ParsingState'
import type { SketchResult } from '@/lib/engines/sketch-generator'
import type { GeneratedQuestion } from '@/lib/engines/discovery-generator'

export type IntakePhase =
  | 'wave1'
  | 'sketching'
  | 'discovery'
  | 'confirming'
  | 'parsing'
  | 'complete'

interface Inference {
  primitive_type: string
  inferred_value: string
  confidence: number
  requires_confirmation: boolean
}

interface IntakePageProps {
  orgId: string
}

export function IntakePage({ orgId }: IntakePageProps) {
  const [phase, setPhase] = useState<IntakePhase>('wave1')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sketch, setSketch] = useState<SketchResult | null>(null)
  const [discoveryQuestions, setDiscoveryQuestions] = useState<
    (GeneratedQuestion & { id: string })[]
  >([])
  const [inferences, setInferences] = useState<Inference[]>([])
  const [, setModelId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── Wave 1 submit ────────────────────────────────────────
  async function handleWave1Submit(
    responses: Record<string, string>
  ) {
    setPhase('sketching')
    setError(null)

    try {
      const res = await fetch('/api/intake/wave1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, responses }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSessionId(data.session_id)
      setSketch(data.sketch)
      setDiscoveryQuestions(data.discovery_questions ?? [])
      setPhase('discovery')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('wave1')
    }
  }

  // ── Discovery submit ─────────────────────────────────────
  async function handleDiscoverySubmit(
    answers: { question_id: string; answer_text: string }[]
  ) {
    setPhase('confirming')
    setError(null)

    try {
      const res = await fetch('/api/intake/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, answers }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setInferences(data.inferences ?? [])

      // If no inferences need confirmation, go straight to parsing
      if (!data.requires_confirmation?.length) {
        await handleFinalParse([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('discovery')
    }
  }

  // ── Final parse ──────────────────────────────────────────
  async function handleFinalParse(
    confirmed: { primitive_type: string; value: string }[]
  ) {
    setPhase('parsing')
    setError(null)

    try {
      const res = await fetch('/api/intake/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          confirmed_inferences: confirmed,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setModelId(data.model_id)
      setPhase('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('confirming')
    }
  }

  return (
    <div className="intake-shell">
      {/* Header */}
      <header className="intake-header">
        <span className="intake-logo">OA</span>
        <span className="intake-phase-label">
          {phase === 'wave1' && 'Context Wave'}
          {phase === 'sketching' && 'Building sketch...'}
          {phase === 'discovery' && 'Discovery'}
          {phase === 'confirming' && 'Inference Review'}
          {phase === 'parsing' && 'Building model...'}
          {phase === 'complete' && 'Model complete'}
        </span>
      </header>

      {/* Progress bar */}
      <div className="intake-progress">
        <div
          className="intake-progress-fill"
          style={{
            width:
              phase === 'wave1' ? '10%' :
              phase === 'sketching' ? '35%' :
              phase === 'discovery' ? '55%' :
              phase === 'confirming' ? '75%' :
              phase === 'parsing' ? '90%' : '100%',
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="intake-error animate-fade">
          {error}
        </div>
      )}

      {/* Phase content */}
      <main className="intake-main">
        {phase === 'wave1' && (
          <Wave1Form onSubmit={handleWave1Submit} />
        )}

        {(phase === 'sketching' || phase === 'discovery') && sketch && (
          <div className="intake-two-col">
            <PipelineSketch sketch={sketch} />
            {phase === 'discovery' && discoveryQuestions.length > 0 && (
              <DiscoveryForm
                questions={discoveryQuestions}
                onSubmit={handleDiscoverySubmit}
              />
            )}
          </div>
        )}

        {phase === 'confirming' && inferences.length > 0 && (
          <InferenceConfirm
            inferences={inferences}
            onConfirm={handleFinalParse}
          />
        )}

        {phase === 'parsing' && <ParsingState />}

        {phase === 'complete' && (
          <div className="intake-complete animate-fade-slide">
            <div className="complete-icon">✦</div>
            <h2>Operational model built.</h2>
            <p>Your pipelines are ready to review.</p>
            <a href="/dashboard" className="btn-primary">
              View dashboard →
            </a>
          </div>
        )}
      </main>

      <style jsx>{`
        .intake-shell {
          min-height: 100vh;
          background: var(--bg);
          display: flex;
          flex-direction: column;
        }
        .intake-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 48px;
          border-bottom: 1px solid var(--border);
        }
        .intake-logo {
          font-family: var(--font-display);
          font-size: 18px;
          color: var(--accent);
          letter-spacing: 0.1em;
        }
        .intake-phase-label {
          font-size: 11px;
          color: var(--text-muted);
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }
        .intake-progress {
          height: 2px;
          background: var(--border);
          position: relative;
        }
        .intake-progress-fill {
          height: 100%;
          background: var(--accent);
          transition: width 0.6s ease;
          box-shadow: 0 0 12px var(--accent-glow);
        }
        .intake-error {
          margin: 16px 48px 0;
          padding: 12px 16px;
          background: rgba(255, 77, 106, 0.1);
          border: 1px solid var(--danger);
          border-radius: 4px;
          color: var(--danger);
          font-size: 13px;
        }
        .intake-main {
          flex: 1;
          padding: 64px 48px;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }
        .intake-two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: start;
        }
        .intake-complete {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          text-align: center;
          gap: 16px;
        }
        .complete-icon {
          font-size: 48px;
          color: var(--accent);
          margin-bottom: 8px;
        }
        .intake-complete h2 {
          font-family: var(--font-display);
          font-size: 32px;
          color: var(--text);
        }
        .intake-complete p {
          color: var(--text-muted);
          font-size: 14px;
        }
        .btn-primary {
          margin-top: 16px;
          padding: 12px 28px;
          background: var(--accent);
          color: var(--bg);
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          letter-spacing: 0.05em;
          transition: opacity 0.2s;
        }
        .btn-primary:hover { opacity: 0.85; }
        @media (max-width: 768px) {
          .intake-two-col { grid-template-columns: 1fr; }
          .intake-main { padding: 32px 24px; }
          .intake-header { padding: 20px 24px; }
        }
      `}</style>
    </div>
  )
}
