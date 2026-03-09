'use client'

import { useEffect, useState } from 'react'
import type { SketchResult } from '@/lib/engines/sketch-generator'

interface PipelineSketchProps {
  sketch: SketchResult
}

export function PipelineSketch({ sketch }: PipelineSketchProps) {
  const [visibleStages, setVisibleStages] = useState(0)

  useEffect(() => {
    const stages = sketch.pipelines[0]?.stages ?? []
    let i = 0
    const interval = setInterval(() => {
      i++
      setVisibleStages(i)
      if (i >= stages.length) clearInterval(interval)
    }, 300)
    return () => clearInterval(interval)
  }, [sketch])

  const stages = sketch.pipelines[0]?.stages ?? []
  const highGaps = sketch.gaps.filter((g) => g.priority === 'high')
  const pct = Math.round(sketch.completeness_score * 100)

  return (
    <div className="sketch-shell animate-fade-slide">
      <div className="sketch-header">
        <span className="sketch-eyebrow">First-pass pipeline sketch</span>
        <div className="sketch-score">
          <div
            className="sketch-score-fill"
            style={{ width: `${pct}%` }}
          />
          <span className="sketch-score-label">{pct}% complete</span>
        </div>
      </div>

      <div className="sketch-pipeline">
        {stages.map((stage, i) => (
          <div
            key={stage.name}
            className={`sketch-stage ${i < visibleStages ? 'stage-visible' : 'stage-hidden'} confidence-${stage.confidence}`}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="stage-order">{String(i + 1).padStart(2, '0')}</div>
            <div className="stage-name">{stage.name}</div>
            <div className={`stage-confidence`}>{stage.confidence}</div>
            {i < stages.length - 1 && <div className="stage-arrow">↓</div>}
          </div>
        ))}
      </div>

      {sketch.roles.length > 0 && (
        <div className="sketch-section">
          <p className="sketch-section-label">Roles identified</p>
          <div className="sketch-tags">
            {sketch.roles.map((r) => (
              <span key={r} className="sketch-tag">{r}</span>
            ))}
          </div>
        </div>
      )}

      {highGaps.length > 0 && (
        <div className="sketch-gaps">
          <p className="sketch-section-label">Gaps to fill</p>
          {highGaps.map((g) => (
            <div key={g.primitive_type} className="sketch-gap">
              <span className="gap-dot" />
              <span className="gap-type">{g.primitive_type.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .sketch-shell {
          display: flex;
          flex-direction: column;
          gap: 32px;
          padding: 32px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          position: sticky;
          top: 32px;
        }
        .sketch-header {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sketch-eyebrow {
          font-size: 10px;
          color: var(--text-muted);
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .sketch-score {
          height: 3px;
          background: var(--border);
          border-radius: 2px;
          position: relative;
          overflow: hidden;
        }
        .sketch-score-fill {
          height: 100%;
          background: var(--accent);
          border-radius: 2px;
          transition: width 1s ease;
          box-shadow: 0 0 8px var(--accent-glow);
        }
        .sketch-score-label {
          position: absolute;
          right: 0;
          top: 6px;
          font-size: 10px;
          color: var(--accent);
        }
        .sketch-pipeline {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .sketch-stage {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .stage-visible { opacity: 1; }
        .stage-hidden { opacity: 0; }
        .confidence-high .stage-name { color: var(--text); }
        .confidence-medium .stage-name { color: var(--text-muted); }
        .confidence-low .stage-name { color: var(--text-dim); }
        .stage-order {
          font-size: 10px;
          color: var(--text-dim);
          width: 20px;
          flex-shrink: 0;
        }
        .stage-name {
          font-size: 14px;
          flex: 1;
        }
        .stage-confidence {
          font-size: 10px;
          color: var(--text-dim);
          letter-spacing: 0.1em;
        }
        .stage-arrow {
          position: absolute;
          left: 8px;
          bottom: -2px;
          color: var(--border-bright);
          font-size: 12px;
        }
        .sketch-section { display: flex; flex-direction: column; gap: 8px; }
        .sketch-section-label {
          font-size: 10px;
          color: var(--text-muted);
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }
        .sketch-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .sketch-tag {
          padding: 4px 10px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 3px;
          font-size: 12px;
          color: var(--text-muted);
        }
        .sketch-gaps { display: flex; flex-direction: column; gap: 6px; }
        .sketch-gap {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .gap-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--warning);
          flex-shrink: 0;
        }
        .gap-type {
          font-size: 12px;
          color: var(--text-muted);
          text-transform: capitalize;
        }
      `}</style>
    </div>
  )
}
