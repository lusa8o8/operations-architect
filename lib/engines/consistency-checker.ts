import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function checkConsistency(
  original: { stages: any[]; roles: any[]; triggers: any[] },
  edited: { stages: any[]; roles: any[]; triggers: any[] }
): Promise<{ ok: boolean; result?: any; error?: string }> {
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
            is_consistent: { type: 'boolean' },
            warnings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  severity: { type: 'string', enum: ['high', 'medium', 'low'] },
                  message: { type: 'string' },
                  suggestion: { type: 'string' }
                },
                required: ['severity', 'message', 'suggestion']
              }
            },
            summary: { type: 'string' },
            changes_detected: {
              type: 'array',
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

Original model:
${JSON.stringify(original, null, 2)}

Edited model:
${JSON.stringify(edited, null, 2)}

Review the changes and check for:
1. Removed stages that break pipeline flow
2. Missing roles that leave stages unowned
3. Triggers that don't connect to any stage
4. Stages added with no clear owner or trigger
5. Anything that would make this pipeline unexecutable

Be direct. Flag only real operational gaps. Do not invent problems.`
      }
    ]
  })

  const toolUse = message.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    return { ok: false, error: 'Claude did not return consistency check' }
  }

  return { ok: true, result: toolUse.input }
}
