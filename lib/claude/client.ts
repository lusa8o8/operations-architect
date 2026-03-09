// ============================================================
// OPERATION-ARCHITECT — Claude API Client
// Single entry point for all Claude API calls
// ============================================================

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClaudeTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export interface ClaudeResponse {
  content: Array<{
    type: 'text' | 'tool_use'
    text?: string
    name?: string
    input?: Record<string, unknown>
  }>
  stop_reason: string
}

export async function callClaude(
  messages: ClaudeMessage[],
  tools?: ClaudeTool[],
  system?: string
): Promise<ClaudeResponse> {
  const body: Record<string, unknown> = {
    model: MODEL,
    max_tokens: 4096,
    messages,
  }

  if (system) body.system = system
  if (tools && tools.length > 0) {
    body.tools = tools
    body.tool_choice = { type: 'any' }
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API error ${response.status}: ${error}`)
  }

  return response.json()
}

export function extractToolResult(
  response: ClaudeResponse,
  toolName: string
): Record<string, unknown> | null {
  const block = response.content.find(
    (b) => b.type === 'tool_use' && b.name === toolName
  )
  return block?.input ?? null
}
