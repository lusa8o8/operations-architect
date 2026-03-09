'use client'

import { useState } from 'react'
import type { GeneratedQuestion } from '@/lib/engines/discovery-generator'

interface DiscoveryFormProps {
  questions: (GeneratedQuestion & { id: string })[]
  onSubmit: (answers: { question_id: string; answer_text: string }[]) => void
}

export function DiscoveryForm({ questions, onSubmit }: DiscoveryFormProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(
    () => Object.fromEntries(questions.map((q) => [q.id, '']))
  )

  function handleSubmit() {
    const formatted = questions.map((q) => ({
      question_id: q.id,
      answer_text: answers[q.id] ?? '',
    }))
    onSubmit(formatted)
  }

  const highPriority = questions.filter((q) => q.priority === 'high')
  const rest = questions.filter((q) => q.priority !== 'high')

  return (
    <div className="discovery-shell animate-fade-slide">
      <div className="discovery-header">
        <p className="discovery-eyebrow">Discovery — {questions.length} questions</p>
        <h2 className="discovery-title">Let&apos;s sharpen the picture.</h2>
        <p className="discovery-sub">
          Answer what you can. Skip what you don&apos;t know — the system will make conservative assumptions.
        </p>
      </div>

      <div className="discovery-questions">
        {highPriority.length > 0 && (
          <div className="q-group">
            <p className="q-group-label">Critical gaps</p>
            {highPriority.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                value={answers[q.id]}
                onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
              />
            ))}
          </div>
        )}

        {rest.length > 0 && (
          <div className="q-group">
            <p className="q-group-label">Additional context</p>
            {rest.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                value={answers[q.id]}
                onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
              />
            ))}
          </div>
        )}
      </div>

      <button className="btn-accent" onClick={handleSubmit}>
        Continue →
      </button>

      <style jsx>{`
        .discovery-shell {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        .discovery-eyebrow {
          font-size: 11px;
          color: var(--accent);
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .discovery-title {
          font-family: var(--font-display);
          font-size: 28px;
          color: var(--text);
          margin-bottom: 8px;
        }
        .discovery-sub {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.6;
        }
        .discovery-questions { display: flex; flex-direction: column; gap: 32px; }
        .q-group { display: flex; flex-direction: column; gap: 16px; }
        .q-group-label {
          font-size: 10px;
          color: var(--text-muted);
          letter-spacing: 0.15em;
          text-transform: uppercase;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border);
        }
        .btn-accent {
          align-self: flex-start;
          padding: 12px 28px;
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
        .btn-accent:hover { opacity: 0.85; }
      `}</style>
    </div>
  )
}

function QuestionCard({
  question,
  value,
  onChange,
}: {
  question: GeneratedQuestion & { id: string }
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="q-card">
      <p className="q-text">{question.question_text}</p>

      {question.options && question.options.length > 0 ? (
        <div className="q-options">
          {question.options.map((opt) => (
            <button
              key={opt}
              className={`q-option ${value === opt ? 'q-option-active' : ''}`}
              onClick={() => onChange(opt)}
            >
              {opt}
            </button>
          ))}
          <input
            className="q-other"
            placeholder="Or type your own..."
            value={question.options.includes(value) ? '' : value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      ) : (
        <textarea
          className="q-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder="Your answer..."
        />
      )}

      <style jsx>{`
        .q-card {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .q-text {
          font-size: 14px;
          color: var(--text);
          line-height: 1.5;
        }
        .q-options { display: flex; flex-wrap: wrap; gap: 8px; }
        .q-option {
          padding: 6px 14px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 3px;
          color: var(--text-muted);
          font-family: var(--font-mono);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .q-option:hover { border-color: var(--border-bright); color: var(--text); }
        .q-option-active {
          border-color: var(--accent);
          color: var(--accent);
          background: var(--accent-dim);
        }
        .q-other, .q-textarea {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 10px 14px;
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 13px;
          outline: none;
          resize: vertical;
          transition: border-color 0.2s;
        }
        .q-other:focus, .q-textarea:focus { border-color: var(--accent); }
        .q-other::placeholder, .q-textarea::placeholder { color: var(--text-dim); }
      `}</style>
    </div>
  )
}
