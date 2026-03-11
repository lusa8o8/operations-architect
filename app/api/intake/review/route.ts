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

  const { sessionId, confirmedStages, confirmedRoles, confirmedTriggers } = await request.json()

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

  const original = model?.model_graph as any

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    tools: [
      {
        name: 'consistency_check',
        description: 'Review CEO edits to the operational model and flag any inconsistencies',
        input_schema: {
          type: 'object' as const,
          properties: {
            is_consistent: {
              type: 'boolean',
              description: 'Whether the edited model is operationally consistent overall'
            },
            warnings: {
              type: 'array',
              description: 'List of inconsistencies or gaps introduced by the edits. Empty if none.',
              items: {
                type: 'object',
                properties: {
                  severity: { type: 'string', enum: ['high', 'medium', 'low'] },
                  message: { type: 'string', description: 'Plain language warning for the CEO' },
                  suggestion: { type: 'string', description: 'What to do about it' }
                },
                required: ['severity', 'message', 'suggestion']
              }
            },
            summary: {
              type: 'string',
              description: 'One sentence summary of the final model in plain language'
            },
            changes_detected: {
              type: 'array',
              description: 'List of what changed from original to edited',
              items: { type: 'string' }
            }
          },
          required: ['is_consistent', 'warnings', 'summary', 'changes_detected']
        }
      }
    ],
    tool_choice: { type: 'tool', name: 'consistency_check' },
    messages: [
      {
        role: 'user',
        content: `You are an operational intelligence engine reviewing CEO edits to their organizational model.

Original model extracted from intake:
${JSON.stringify({ stages: original?.stages, roles: original?.roles, triggers: original?.triggers }, null, 2)}

Edited model submitted by CEO:
${JSON.stringify({ stages: confirmedStages, roles: confirmedRoles, triggers: confirmedTriggers }, null, 2)}

Review the changes and check for:
1. Removed stages that break the pipeline flow
2. Missing roles that leave stages unowned
3. Triggers that don't connect to any stage
4. Stages added that have no clear owner or trigger
5. Anything that would make this pipeline unexecutable

Be direct and specific. If the model is sound, say so. Do not invent problems that don't exist.
Flag only real operational gaps, not stylistic differences.`
      }
    ]
  })

  const toolUse = message.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    return NextResponse.json({ error: 'Claude did not return consistency check' }, { status: 500 })
  }

  return NextResponse.json(toolUse.input)
}
