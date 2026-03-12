import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function parseContext(
  responses: Record<string, string>,
  orgId: string,
  sessionId: string
): Promise<{ ok: boolean; primitives?: any; error?: string }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

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
            north_star: { type: 'string' },
            primary_customer: { type: 'string' },
            value_proposition: { type: 'string' },
            stages: {
              type: 'array',
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
            confidence_score: { type: 'number' }
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
- What is the main outcome your organization is trying to produce? "${responses['org_goal'] ?? ''}"
- Who receives the value your organization produces? "${responses['primary_customer'] ?? ''}"
- What does your organization provide to them? "${responses['value_delivery'] ?? ''}"
- When does someone decide to use your service? "${responses['value_moment'] ?? ''}"
- What usually happens between discovering you and receiving value? "${responses['value_journey'] ?? ''}"
- What roles currently exist in the organization? "${responses['team_roles'] ?? ''}"
- Where does work usually slow down or become chaotic? "${responses['bottleneck'] ?? ''}"

Extract all operational primitives. Be specific and concrete. Minimum 3 pipeline stages.`
      }
    ]
  })

  const toolUse = message.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    return { ok: false, error: 'Claude did not return structured output' }
  }

  const primitives = toolUse.input as any

  const inserts = [
    ...(primitives.stages ?? []).map((s: any) => ({
      org_id: orgId, primitive_type: 'stage', inferred_value: s,
      confidence: primitives.confidence_score ?? 0.7, status: 'pending', source_response: sessionId
    })),
    ...(primitives.roles ?? []).map((r: any) => ({
      org_id: orgId, primitive_type: 'owner', inferred_value: r,
      confidence: primitives.confidence_score ?? 0.7, status: 'pending', source_response: sessionId
    })),
    ...(primitives.triggers ?? []).map((t: any) => ({
      org_id: orgId, primitive_type: 'trigger', inferred_value: t,
      confidence: primitives.confidence_score ?? 0.7, status: 'pending', source_response: sessionId
    })),
  ]

  if (inserts.length > 0) {
    const { error: storeError } = await supabase.from('inferred_primitives').insert(inserts)
    if (storeError) console.error('Primitives store error:', storeError)
  }

  await supabase.from('operational_models').insert({
    org_id: orgId,
    version: 1,
    model_graph: primitives,
    confidence_score: primitives.confidence_score ?? 0.7
  })

  await supabase
    .from('intake_sessions')
    .update({ status: 'wave1_complete', completed_at: new Date().toISOString() })
    .eq('id', sessionId)

  return { ok: true, primitives }
}
