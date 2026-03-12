import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function generateDiscovery(
  modelGraph: any,
  sessionId: string
): Promise<{ ok: boolean; gaps?: string[]; questions?: any[]; error?: string }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    tools: [
      {
        name: 'generate_discovery_questions',
        description: 'Generate adaptive discovery questions based on gaps in the operational model',
        input_schema: {
          type: 'object' as const,
          properties: {
            gaps_detected: {
              type: 'array',
              items: { type: 'string' }
            },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  question: { type: 'string' },
                  why: { type: 'string' },
                  priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                  type: { type: 'string', enum: ['trigger_signal', 'entry_point', 'artifact', 'decision_point', 'capacity', 'feedback_loop', 'ownership'] }
                },
                required: ['key', 'question', 'why', 'priority', 'type']
              }
            }
          },
          required: ['gaps_detected', 'questions']
        }
      }
    ],
    tool_choice: { type: 'tool', name: 'generate_discovery_questions' },
    messages: [
      {
        role: 'user',
        content: `You are an operational intelligence engine analyzing a first-pass organizational model built from CEO narrative.

Your job: identify what is MISSING or VAGUE in this model, then generate targeted discovery questions to fill those gaps.

Current model:
${JSON.stringify(modelGraph, null, 2)}

Rules:
- Maximum 8 questions
- Only ask what is genuinely missing
- Questions must be specific to THIS organization
- Phrase questions simply — CEOs are busy, vague answers are fine
- Priority: missing triggers and entry points first, then artifacts and decisions, then capacity
- The CEO may not know — design questions that allow honest "I don't know" responses
- Focus on what would make the pipeline EXECUTABLE`
      }
    ]
  })

  const toolUse = message.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    return { ok: false, error: 'Claude did not return discovery questions' }
  }

  const result = toolUse.input as any

  const questionInserts = result.questions.map((q: any) => ({
    session_id: sessionId,
    question_type: q.type,
    question_text: q.question,
    generated_reason: q.why,
    priority: q.priority,
  }))

  const { data: stored, error: storeError } = await supabase
    .from('discovery_questions')
    .insert(questionInserts)
    .select('id, question_text, question_type, generated_reason, priority')

  if (storeError) {
    console.error('Discovery store error:', storeError)
    return { ok: false, error: storeError.message }
  }

  return { ok: true, gaps: result.gaps_detected, questions: stored }
}
