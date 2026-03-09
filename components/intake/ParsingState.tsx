'use client'

import { useEffect, useState } from 'react'

const STEPS = [
  'Analyzing organizational context...',
  'Mapping value flow...',
  'Identifying pipeline primitives...',
  'Assigning stage ownership...',
  'Running chaos detection...',
  'Building operational model...',
]

export function ParsingState() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s < STEPS.length - 1 ? s + 1 : s))
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="parsing-shell animate-fade">
      <div className="parsing-spinner">
        <div className="spinner-ring" />
        <span className="spinner-icon">⬡</span>
      </div>
      <div className="parsing-steps">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`parsing-step ${i < step ? 'step-done' : ''} ${i === step ? 'step-active' : ''} ${i > step ? 'step-pending' : ''}`}
          >
            <span className="step-dot" />
            <span className="step-text">{s}</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        .parsing-shell { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 48px; }
        .parsing-spinner { position: relative; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; }
        .spinner-ring { position: absolute; inset: 0; border-radius: 50%; border: 2px solid var(--border); border-top-color: var(--accent); animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner-icon { font-size: 24px; color: var(--accent); animation: pulse-accent 2s ease-in-out infinite; }
        .parsing-steps { display: flex; flex-direction: column; gap: 10px; min-width: 320px; }
        .parsing-step { display: flex; align-items: center; gap: 12px; transition: all 0.3s; }
        .step-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; transition: all 0.3s; }
        .step-done .step-dot { background: var(--accent); }
        .step-active .step-dot { background: var(--accent); box-shadow: 0 0 8px var(--accent-glow); }
        .step-pending .step-dot { background: var(--border-bright); }
        .step-done .step-text { color: var(--text-muted); }
        .step-active .step-text { color: var(--text); }
        .step-pending .step-text { color: var(--text-dim); }
        .step-text { font-size: 13px; }
      `}</style>
    </div>
  )
}
