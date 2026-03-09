// POST /api/intake/wave1
// Saves Wave 1 responses, runs sketch generator (fast, no AI),
// generates discovery questions (Claude call),
// stores everything. Returns sketch + discovery questions.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSketch } from '@/lib/engines/sketch-generator'
import { generateDiscoveryQuestions } from '@/lib/engines/discovery-generator'
import { WAVE1_QUESTIONS } from '@/lib/types'
import type { Wave1QuestionKey } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { org_id, responses } = await req.json()

    if (!org_id) {
      return NextResponse.json({ error: 'org_id is required' }, { status: 400 })
    }

    const missingKeys = WAVE1_QUESTIONS.filter(
      (key) => !responses?.[key] || responses[key].trim() === ''
    )
    if (missingKeys.length > 0) {
      return NextResponse.json(
        { error: `Missing responses for: ${missingKeys.join(', ')}` },
        { status: 400 }
      )
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', org_id)
      .eq('owner_id', user.id)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { data: session, error: sessionError } = await supabase
      .from('intake_sessions')
      .insert({ org_id, status: 'in_progress' })
      .select()
      .single()

    if (sessionError || !session) {
      throw new Error(`Session creation failed: ${sessionError?.message}`)
    }

    await supabase.from('intake_responses').insert(
      WAVE1_QUESTIONS.map((key: Wave1QuestionKey) => ({
        session_id: session.id,
        question_key: key,
        response_text: responses[key],
      }))
    )

    // Fast sketch — no AI call
    const sketch = generateSketch(responses as Record<Wave1QuestionKey, string>)

    // Discovery questions — Claude call against gaps only
    const questions = await generateDiscoveryQuestions(sketch.gaps, {
      org_goal: responses.org_goal,
      value_delivery: responses.value_delivery,
      value_journey: responses.value_journey,
      primary_customer: responses.primary_customer,
    })

    if (questions.length > 0) {
      await supabase.from('discovery_questions').insert(
        questions.map((q) => ({
          session_id: session.id,
          question_type: q.question_type,
          question_text: q.question_text,
          generated_reason: q.generated_reason,
          priority: q.priority,
        }))
      )
    }

    await supabase
      .from('intake_sessions')
      .update({ status: 'wave1_complete' })
      .eq('id', session.id)

    return NextResponse.json({
      session_id: session.id,
      sketch,
      discovery_questions: questions,
      completeness_score: sketch.completeness_score,
    })

  } catch (error) {
    console.error('[wave1]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
