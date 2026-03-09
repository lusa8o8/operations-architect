'use client'

import { useState } from 'react'
import { WAVE1_QUESTIONS, WAVE1_QUESTION_TEXT } from '@/lib/types'
import type { Wave1QuestionKey } from '@/lib/types'

interface Wave1FormProps {
  onSubmit: (responses: Record<string, string>) => void
}

const PLACEHOLDERS: Record<Wave1QuestionKey, string> = {
  org_goal: 'e.g. Sustainable revenue growth through scalable academic support',
  primary_customer: 'e.g. University students preparing for assessments',
  value_delivery: 'e.g. Live tutoring sessions, question banks, study hub access',
  value_moment: 'e.g. When students have an upcoming exam or assignment',
  value_journey: 'e.g. Student sees campaign → attends free class → upgrades to premium → joins hub',
  team_roles: 'e.g. CEO, Tutors, Marketing, Sales, Content Manager',
  bottleneck: 'e.g. Tutor prep delays, last-minute student behavior, manual coordination',
}

export function Wave1Form({ onSubmit }: Wave1FormProps) {
  const [responses, setResponses] = useState<Record<Wave1QuestionKey, string>>(
    () => Object.fromEntries(WAVE1_QUESTIONS.map((k) => [k, ''])) as Record<Wave1QuestionKey, string>
  )
  const [activeIndex, setActiveIndex] = useState(0)

  const currentKey = WAVE1_QUESTIONS[activeIndex]
  const isLast = activeIndex === WAVE1_QUESTIONS.length - 1

  function handleNext() {
    if (responses[currentKey].trim() === '') return
    if (isLast) {
      onSubmit(responses)
    } else {
      setActiveIndex((i) => i + 1)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleNext()
    }
  }

  return (
    <div className="wave1-shell">
      <div className="wave1-intro animate-fade-slide">
        <p className="wave1-eyebrow">Context Wave — 7 questions</p>
        <h1 className="wave1-title">
          Tell us about your organization.
        </h1>
        <p className="wave1-sub">
          Answer honestly. The more specific you are, the more accurate your operational model will be.
        </p>
      </div>

      <div className="wave1-progress-dots">
        {WAVE1_QUESTIONS.map((_, i) => (
          <button
            key={i}
            className={`dot ${i === activeIndex ? 'dot-active' : ''} ${responses[WAVE1_QUESTIONS[i]].trim() ? 'dot-done' : ''}`}
            onClick={() => setActiveIndex(i)}
            aria-label={`Question ${i + 1}`}
          />
        ))}
      </div>

      <div key={currentKey} className="wave1-question animate-fade-slide">
        <label className="question-number">
          {String(activeIndex + 1).padStart(2, '0')} / {String(WAVE1_QUESTIONS.length).padStart(2, '0')}
        </label>
        <p className="question-text">
          {WAVE1_QUESTION_TEXT[currentKey]}
        </p>
        <textarea
          className="question-input"
          value={responses[currentKey]}
          onChange={(e) =>
            setResponses((prev) => ({ ...prev, [currentKey]: e.target.value }))
          }
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDERS[currentKey]}
          rows={4}
          autoFocus
        />
        <div className="question-actions">
          {activeIndex > 0 && (
            <button
              className="btn-ghost"
              onClick={() => setActiveIndex((i) => i - 1)}
            >
              ← Back
            </button>
          )}
          <button
            className="btn-accent"
            onClick={handleNext}
            disabled={responses[currentKey].trim() === ''}
          >
            {isLast ? 'Build my pipeline →' : 'Next →'}
          </button>
          <span className="kbd-hint">or ⌘ + Enter</span>
        </div>
      </div>

      <style jsx>{`
        .wave1-shell {
          max-width: 680px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 48px;
        }
        .wave1-eyebrow {
          font-size: 11px;
          color: var(--accent);
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .wave1-title {
          font-family: var(--font-display);
          font-size: 40px;
          color: var(--text);
          line-height: 1.15;
          margin-bottom: 12px;
        }
        .wave1-sub {
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.6;
        }
        .wave1-progress-dots {
          display: flex;
          gap: 8px;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--border-bright);
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          padding: 0;
        }
        .dot-active {
          background: var(--accent);
          box-shadow: 0 0 8px var(--accent-glow);
          transform: scale(1.2);
        }
        .dot-done {
          background: var(--accent-dim);
          border: 1px solid var(--accent);
        }
        .wave1-question {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .question-number {
          font-size: 11px;
          color: var(--text-muted);
          letter-spacing: 0.15em;
        }
        .question-text {
          font-family: var(--font-display);
          font-size: 24px;
          color: var(--text);
          line-height: 1.3;
        }
        .question-input {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 16px;
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 14px;
          line-height: 1.6;
          resize: vertical;
          outline: none;
          transition: border-color 0.2s;
        }
        .question-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 1px var(--accent-dim);
        }
        .question-input::placeholder { color: var(--text-dim); }
        .question-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .btn-accent {
          padding: 10px 24px;
          background: var(--accent);
          color: var(--bg);
          border: none;
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .btn-accent:disabled { opacity: 0.3; cursor: not-allowed; }
        .btn-accent:not(:disabled):hover { opacity: 0.85; }
        .btn-ghost {
          padding: 10px 16px;
          background: transparent;
          color: var(--text-muted);
          border: 1px solid var(--border);
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-ghost:hover {
          border-color: var(--border-bright);
          color: var(--text);
        }
        .kbd-hint {
          font-size: 11px;
          color: var(--text-dim);
          letter-spacing: 0.05em;
        }
      `}</style>
    </div>
  )
}
