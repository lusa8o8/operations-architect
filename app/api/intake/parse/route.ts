import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

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

  const { data: responses, error: fetchError } = await supabase
    .from('intake_responses')
    .select('question_key, response_text')
    .eq('session_id', sessionId)

  if (fetchError || !responses || responses.length === 0) {
    return NextResponse.json({ error: 'No responses found for session' }, { status: 400 })
  }

  const responseMap: Record<string, string> = {}
  responses.forEach(r => { responseMap[r.question_key] = r.response_text })

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    tools: [
      {
        name: 'extract_operational_primitives',
        description: 'Extract structured operational primitives from CEO intake responses',
        input_schema: {
          type: 'object' as const,
          properties: {
            north_star: {
              type: 'string',
              description: 'The core outcome the organization is trying to produce'
            },
            primary_customer: {
              type: 'string',
              description: 'Who receives the value'
            },
            value_proposition: {
              type: 'string',
              description: 'What the organization provides'
            },
            stages: {
              type: 'array',
              description: 'Ordered pipeline stages from discovery to value delivery',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  order: { type: 'number' }
                },
                required: ['name', 'description', 'order']
              }
            },
            roles: {
              type: 'array',
              description: 'Human and AI roles identified in the organization',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string', enum: ['human', 'ai', 'automation'] }
                },
                required: ['name', 'type']
              }
            },
            triggers: {
              type: 'array',
              description: 'Events that start pipeline execution',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' }
                },
                required: ['name', 'description']
              }
            },
            bottlenecks: {
              type: 'array',
              description: 'Areas where work slows down',
              items: {
                type: 'object',
                properties: {
                  stage: { type: 'string' },
                  description: { type: 'string' },
                  severity: { type: 'string', enum: ['low', 'medium', 'high'] }
                },
                required: ['stage', 'description', 'severity']
              }
            },
            confidence_score: {
              type: 'number',
              description: 'Overall confidence in the extraction, 0 to 1'
            }
          },
          required: ['north_star', 'primary_customer', 'value_proposition', 'stages', 'roles', 'triggers', 'bottlenecks', 'confidence_score']
        }
      }
    ],
    tool_choice: { type: 'tool', name: 'extract_operational_primitives' },
    messages: [
      {
        role: 'user',
        content: `You are an operational intelligence engine. Extract structured primitives from these CEO intake responses.

Responses:
- What is the main outcome your organization is trying to produce? "${responseMap['org_goal'] ?? ''}"
- Who receives the value your organization produces? "${responseMap['primary_customer'] ?? ''}"
- What does your organization provide to them? "${responseMap['value_delivery'] ?? ''}"
- When does someone decide to use your service? "${responseMap['value_moment'] ?? ''}"
- What usually happens between discovering you and receiving value? "${responseMap['value_journey'] ?? ''}"
- What roles currently exist in the organization? "${responseMap['team_roles'] ?? ''}"
- Where does work usually slow down or become chaotic? "${responseMap['bottleneck'] ?? ''}"

Extract all operational primitives. Be specific and concrete. Minimum 3 pipeline stages.`
      }
    ]
  })

  const toolUse = message.content.find(block => block.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    return NextResponse.json({ error: 'Claude did not return structured output' }, { status: 500 })
  }

  const primitives = toolUse.input

  const { data: sessionRow } = await supabase
    .from('intake_sessions')
    .select('org_id')
    .eq('id', sessionId)
    .single()

  if (!sessionRow?.org_id) {
    return NextResponse.json({ error: 'Session not found' }, { status: 400 })
  }

  const { error: storeError } = await supabase
    .from('inferred_primitives')
    .insert({
      org_id: sessionRow.org_id,
      type: 'wave1_parse',
      inferred_value: primitives,
      confidence: (primitives as any).confidence_score ?? 0.7,
      status: 'pending_confirmation',
      source_response: sessionId
    })

  if (storeError) {
    console.error('Store error:', storeError)
  }

  await supabase
    .from('intake_sessions')
    .update({ status: 'wave1_complete', completed_at: new Date().toISOString() })
    .eq('id', sessionId)

  return NextResponse.json({ ok: true, primitives })
}
