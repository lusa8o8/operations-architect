import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()

  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: { user }, error: authError } = await authClient.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await request.json()
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: session } = await supabase
    .from('intake_sessions')
    .select('org_id')
    .eq('id', sessionId)
    .single()

  const { data: model } = await supabase
    .from('operational_models')
    .select('model_graph')
    .eq('org_id', session?.org_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!model) {
    return NextResponse.json({ error: 'No model found — run Wave 1 parse first' }, { status: 400 })
  }

  const graph = model.model_graph as any

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
              description: 'List of missing or unclear primitives detected in the model',
              items: { type: 'string' }
            },
            questions: {
              type: 'array',
              description: 'Discovery questions to fill the gaps. Maximum 8 questions.',
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string', description: 'Unique key like gap_trigger_1' },
                  question: { type: 'string', description: 'The question to ask the CEO' },
                  why: { type: 'string', description: 'Why this gap matters operationally' },
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
${JSON.stringify(graph, null, 2)}

Rules:
- Maximum 8 questions
- Only ask what is genuinely missing — do not ask about things already captured
- Questions must be specific to THIS organization, not generic
- Phrase questions simply — CEOs are busy, answers will be vague, that is okay
- Priority: missing triggers and entry points first, then artifacts and decisions, then capacity
- The CEO may not know the answer — that is fine, design questions that allow honest "I don't know" responses
- Focus on what would make the pipeline EXECUTABLE, not just descriptive`
      }
    ]
  })

  const toolUse = message.content.find(block => block.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    return NextResponse.json({ error: 'Claude did not return discovery questions' }, { status: 500 })
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
    return NextResponse.json({ error: storeError.message }, { status: 500 })
  }

  return NextResponse.json({
    gaps: result.gaps_detected,
    questions: stored
  })
}
