// ============================================================
// OPERATION-ARCHITECT — Discovery Question Generator
// Runs after sketch generation.
// Uses Claude to generate adaptive questions from gaps only.
// Maximum 15 questions. High priority gaps first.
// North Star: ask only what is needed, never more.
// ============================================================

import { callClaude, extractToolResult } from '@/lib/claude/client'
import type { PrimitiveGap } from '@/lib/engines/sketch-generator'
import type { QuestionType, Priority } from '@/lib/types'

export interface GeneratedQuestion {
  question_type: QuestionType
  question_text: string
  generated_reason: string
  priority: Priority
  options?: string[]
}

const GENERATE_QUESTIONS_TOOL = {
  name: 'generate_discovery_questions',
  description:
    'Generate targeted discovery questions to fill operational primitive gaps. Questions must be specific to the organization context provided.',
  input_schema: {
    type: 'object',
    required: ['questions'],
    properties: {
      questions: {
        type: 'array',
        maxItems: 15,
        items: {
          type: 'object',
          required: ['question_type', 'question_text', 'generated_reason', 'priority'],
          properties: {
            question_type: {
              type: 'string',
              enum: [
                'trigger_signal', 'entry_point', 'artifact',
                'decision_point', 'capacity', 'feedback_loop', 'ownership',
              ],
            },
            question_text: { type: 'string' },
            generated_reason: { type: 'string' },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            options: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    },
  },
}

const SYSTEM_PROMPT = `You are the Discovery Engine for Operation-Architect.

Your job is to generate targeted questions that fill specific gaps in an organization's operational model.

Rules:
1. Generate questions ONLY for the gaps provided. Do not add extra questions.
2. Make questions specific to the organization context — reference their actual business.
3. Offer multiple choice options where possible to reduce CEO effort.
4. Maximum 15 questions total. Prioritize high-priority gaps first.
5. Questions must be conversational, not bureaucratic.
6. Never ask for information already captured in Wave 1.`

export async function generateDiscoveryQuestions(
  gaps: PrimitiveGap[],
  orgContext: {
    org_goal: string
    value_delivery: string
    value_journey: string
    primary_customer: string
  }
): Promise<GeneratedQuestion[]> {
  const prioritized = [...gaps]
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return order[a.priority] - order[b.priority]
    })
    .slice(0, 15)

  const userMessage = `Organization context:
- Goal: ${orgContext.org_goal}
- They provide: ${orgContext.value_delivery}
- Their customers: ${orgContext.primary_customer}
- Their value journey: ${orgContext.value_journey}

Gaps to fill (priority order):
${prioritized.map((g, i) => `${i + 1}. [${g.priority.toUpperCase()}] ${g.primitive_type}: ${g.reason}`).join('\n')}

Generate targeted discovery questions for each gap. Be specific to this organization.`

  const response = await callClaude(
    [{ role: 'user', content: userMessage }],
    [GENERATE_QUESTIONS_TOOL],
    SYSTEM_PROMPT
  )

  const result = extractToolResult(response, 'generate_discovery_questions')
  if (!result) throw new Error('Discovery generator: no tool_use result')

  return (result.questions as GeneratedQuestion[]) ?? []
}
