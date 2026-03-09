// POST /api/intake/discovery
// Saves CEO answers to discovery questions.
// Generates inferred primitives for unanswered high-priority gaps.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude, extractToolResult } from '@/lib/claude/client'

const INFER_TOOL = {
  name: 'generate_inferences',
  description: 'Generate soft assumptions for primitives that could not be answered directly.',
  input_schema: {
    type: 'object',
    required: ['inferences'],
    properties: {
      inferences: {
        type: 'array',
        items: {
          type: 'object',
          required: ['primitive_type', 'inferred_value', 'confidence', 'requires_confirmation'],
          properties: {
            primitive_type: { type: 'string' },
            inferred_value: { type: 'string' },
            confidence: { type: 'number' },
            requires_confirmation: { type: 'boolean' },
          },
        },
      },
    },
  },
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { session_id, answers } = await req.json()

    if (!session_id || !answers?.length) {
      return NextResponse.json(
        { error: 'session_id and answers are required' },
        { status: 400 }
      )
    }

    await supabase.from('discovery_responses').insert(
      answers.map((a: { question_id: string; answer_text: string }) => ({
        question_id: a.question_id,
        response_text: a.answer_text,
      }))
    )

    await supabase
      .from('discovery_questions')
      .update({ answered: true })
      .in('id', answers.map((a: { question_id: string }) => a.question_id))

    // Find unanswered high-priority questions → infer
    const { data: unanswered } = await supabase
      .from('discovery_questions')
      .select('id, question_text, question_type, priority')
      .eq('session_id', session_id)
      .eq('answered', false)
      .eq('priority', 'high')

    let inferences: Array<{
      primitive_type: string
      inferred_value: string
      confidence: number
      requires_confirmation: boolean
    }> = []

    if (unanswered && unanswered.length > 0) {
      const response = await callClaude(
        [{
          role: 'user',
          content: `These high-priority operational questions were not answered. Generate conservative inferences for each.
Unanswered questions:
${unanswered.map((q) => `[${q.question_type}] ${q.question_text}`).join('\n')}
Be conservative. Confidence 0.3-0.5 for uncertain inferences.`,
        }],
        [INFER_TOOL],
        'You are the Inference Engine for Operation-Architect. Generate soft assumptions for missing operational primitives. Always set requires_confirmation: true. Never infer with high confidence on ambiguous data.'
      )

      const result = extractToolResult(response, 'generate_inferences')
      inferences = (result?.inferences as typeof inferences) ?? []

      const { data: session } = await supabase
        .from('intake_sessions')
        .select('org_id')
        .eq('id', session_id)
        .single()

      if (session && inferences.length > 0) {
        await supabase.from('inferred_primitives').insert(
          inferences.map((inf) => ({
            org_id: session.org_id,
            primitive_type: inf.primitive_type,
            inferred_value: { value: inf.inferred_value },
            confidence: inf.confidence,
            status: 'pending',
          }))
        )
      }
    }

    await supabase
      .from('intake_sessions')
      .update({ status: 'discovery_complete' })
      .eq('id', session_id)

    return NextResponse.json({
      inferences,
      requires_confirmation: inferences.filter((i) => i.requires_confirmation),
    })

  } catch (error) {
    console.error('[discovery]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
