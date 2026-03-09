'use client'

import { useState } from 'react'

interface Inference {
  primitive_type: string
  inferred_value: string
  confidence: number
  requires_confirmation: boolean
}

interface InferenceConfirmProps {
  inferences: Inference[]
  onConfirm: (confirmed: { primitive_type: string; value: string }[]) => void
}

export function InferenceConfirm({ inferences, onConfirm }: InferenceConfirmProps) {
  const [decisions, setDecisions] = useState<Record<number, 'accept' | 'reject'>>(
    () => Object.fromEntries(inferences.map((_, i) => [i, 'accept']))
  )

  function handleConfirm() {
    const confirmed = inferences
      .filter((_, i) => decisions[i] === 'accept')
      .map((inf) => ({
        primitive_type: inf.primitive_type,
        value: inf.inferred_value,
      }))
    onConfirm(confirmed)
  }

  return (
    <div className="infer-shell animate-fade-slide">
      <div className="infer-header">
        <p className="infer-eyebrow">Inference Review</p>
        <h2 className="infer-title">We made some assumptions.</h2>
        <p className="infer-sub">
          Review each one. Accept what&apos;s correct, reject what isn&apos;t.
        </p>
      </div>

      <div className="infer-list">
        {inferences.map((inf, i) => (
          <div key={i} className={`infer-card ${decisions[i] === 'reject' ? 'card-rejected' : ''}`}>
            <div className="infer-meta">
              <span className="infer-type">{inf.primitive_type.replace('_', ' ')}</span>
              <span className="infer-confidence">
                {Math.round(inf.confidence * 100)}% confidence
              </span>
            </div>
            <p className="infer-value">&quot;{inf.inferred_value}&quot;</p>
            <div className="infer-actions">
              <button
                className={`infer-btn ${decisions[i] === 'accept' ? 'btn-accept-active' : 'btn-accept'}`}
                onClick={() => setDecisions((d) => ({ ...d, [i]: 'accept' }))}
              >
                ✓ Accept
              </button>
              <button
                className={`infer-btn ${decisions[i] === 'reject' ? 'btn-reject-active' : 'btn-reject'}`}
                onClick={() => setDecisions((d) => ({ ...d, [i]: 'reject' }))}
              >
                ✕ Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="btn-primary" onClick={handleConfirm}>
        Build operational model →
      </button>

      <style jsx>{`
        .infer-shell { max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; gap: 32px; }
        .infer-eyebrow { font-size: 11px; color: var(--accent); letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 8px; }
        .infer-title { font-family: var(--font-display); font-size: 32px; color: var(--text); margin-bottom: 8px; }
        .infer-sub { font-size: 14px; color: var(--text-muted); line-height: 1.6; }
        .infer-list { display: flex; flex-direction: column; gap: 12px; }
        .infer-card { padding: 20px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; display: flex; flex-direction: column; gap: 10px; transition: opacity 0.2s; }
        .card-rejected { opacity: 0.4; }
        .infer-meta { display: flex; justify-content: space-between; align-items: center; }
        .infer-type { font-size: 11px; color: var(--text-muted); letter-spacing: 0.1em; text-transform: uppercase; }
        .infer-confidence { font-size: 11px; color: var(--warning); }
        .infer-value { font-size: 14px; color: var(--text); line-height: 1.5; font-style: italic; }
        .infer-actions { display: flex; gap: 8px; }
        .infer-btn { padding: 6px 14px; border-radius: 3px; font-family: var(--font-mono); font-size: 12px; cursor: pointer; transition: all 0.15s; border: 1px solid var(--border); background: transparent; color: var(--text-muted); }
        .btn-accept-active { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
        .btn-reject-active { border-color: var(--danger); color: var(--danger); background: rgba(255,77,106,0.1); }
        .btn-primary { align-self: flex-start; padding: 12px 28px; background: var(--accent); color: var(--bg); border: none; border-radius: 4px; font-family: var(--font-mono); font-size: 13px; font-weight: 500; cursor: pointer; transition: opacity 0.2s; }
        .btn-primary:hover { opacity: 0.85; }
      `}</style>
    </div>
  )
}
