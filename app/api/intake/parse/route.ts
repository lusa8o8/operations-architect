// POST /api/intake/parse
// Final parse. Fires only when discovery_complete.
// Loads full context, runs parseFullContext(),
// stores operational model, marks session complete.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseFullContext } from '@/lib/engines/context-parser'
import type { Wave1QuestionKey } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { session_id, confirmed_inferences } = await req.json()

    if (!session_id) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 })
    }

    const { data: session } = await supabase
      .from('intake_sessions')
      .select('id, org_id, status')
      .eq('id', session_id)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.status !== 'discovery_complete') {
      return NextResponse.json(
        { error: 'Discovery must be complete before final parse' },
        { status: 400 }
      )
    }

    // Load Wave 1
    const { data: wave1Rows } = await supabase
      .from('intake_responses')
      .select('question_key, response_text')
      .eq('session_id', session_id)

    const wave1 = Object.fromEntries(
      (wave1Rows ?? []).map((r) => [r.question_key, r.response_text ?? ''])
    ) as Record<Wave1QuestionKey, string>

    // Load discovery answers with joined question text
    const { data: discoveryRows } = await supabase
      .from('discovery_responses')
      .select(`
        response_text,
        discovery_questions!inner(question_text, question_type, session_id)
      `)
      .eq('discovery_questions.session_id', session_id)

    const discoveryAnswers = (discoveryRows ?? []).map((r) => {
      const q = r.discovery_questions as unknown as {
        question_text: string
        question_type: string
      }
      return {
        question: q?.question_text ?? '',
        answer: r.response_text ?? '',
        type: q?.question_type ?? '',
      }
    })

    // Run full context parser with complete data
    const parsed = await parseFullContext({
      wave1,
      discoveryAnswers,
      confirmedInferences: confirmed_inferences ?? [],
    })

    // Calculate average confidence
    const scores = Object.values(parsed.confidence_scores)
    const avgConfidence = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0

    const { data: model } = await supabase
      .from('operational_models')
      .insert({
        org_id: session.org_id,
        version: 1,
        model_graph: parsed as unknown as Record<string, unknown>,
        confidence_score: avgConfidence,
      })
      .select()
      .single()

    if (parsed.north_star) {
      await supabase
        .from('organizations')
        .update({
          north_star: parsed.north_star,
          primary_metric: parsed.primary_metric,
          status: 'active',
        })
        .eq('id', session.org_id)
    }

    await supabase
      .from('intake_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', session_id)

    if (confirmed_inferences?.length > 0) {
      await supabase
        .from('inferred_primitives')
        .update({ status: 'confirmed' })
        .eq('org_id', session.org_id)
        .eq('status', 'pending')
    }

    return NextResponse.json({
      model_id: model?.id,
      parsed,
      validation: parsed.validation,
    })

  } catch (error) {
    console.error('[parse]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
