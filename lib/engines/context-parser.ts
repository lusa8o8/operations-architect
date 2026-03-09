// ============================================================
// OPERATION-ARCHITECT — Context Parser Engine
// Fires ONCE — only after Wave 1 + Discovery + Inference
// are complete. Full context only. Never partial.
// North Star: accurate operational model from complete data.
// ============================================================

import { callClaude, extractToolResult } from '@/lib/claude/client'
import type { Wave1QuestionKey } from '@/lib/types'

export interface ParsedStage {
  name: string
  order: number
  description: string
  owner_role: string | null
}

export interface ParsedRole {
  name: string
  role_type: 'human' | 'ai' | 'automation'
  description: string
}

export interface ParsedArtifact {
  name: string
  artifact_type: string
  produced_after_stage: string
  consumed_by_stage: string
}

export interface ParsedTrigger {
  name: string
  trigger_type: 'signal' | 'scheduled' | 'manual' | 'threshold'
  signal_source: string
}

export interface ParsedPipeline {
  name: string
  pipeline_type: 'demand' | 'conversion' | 'delivery' | 'retention' | 'support'
  stages: ParsedStage[]
}

export interface ParsedDecision {
  at_stage: string
  question: string
  true_path: string
  false_path: string
  confidence: number
}

export interface ParsedInference {
  primitive_type: string
  inferred_value: string
  confidence: number
  requires_confirmation: boolean
}

export interface ContextParserOutput {
  north_star: string
  primary_metric: string
  pipelines: ParsedPipeline[]
  roles: ParsedRole[]
  artifacts: ParsedArtifact[]
  triggers: ParsedTrigger[]
  decisions: ParsedDecision[]
  bottlenecks: string[]
  inferences: ParsedInference[]
  confidence_scores: Record<string, number>
  validation: {
    passed: boolean
    errors: string[]
  }
}

const PARSE_CONTEXT_TOOL = {
  name: 'parse_full_organizational_context',
  description:
    'Extract a complete operational model from the full intake dataset. This is the final parse — it must be accurate.',
  input_schema: {
    type: 'object',
    required: [
      'north_star', 'primary_metric', 'pipelines', 'roles',
      'artifacts', 'triggers', 'decisions', 'bottlenecks',
      'inferences', 'confidence_scores',
    ],
    properties: {
      north_star: { type: 'string' },
      primary_metric: { type: 'string' },
      pipelines: {
        type: 'array',
        description: 'Maximum 5 pipelines.',
        items: {
          type: 'object',
          required: ['name', 'pipeline_type', 'stages'],
          properties: {
            name: { type: 'string' },
            pipeline_type: {
              type: 'string',
              enum: ['demand', 'conversion', 'delivery', 'retention', 'support'],
            },
            stages: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'order', 'description', 'owner_role'],
                properties: {
                  name: { type: 'string' },
                  order: { type: 'number' },
                  description: { type: 'string' },
                  owner_role: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
      },
      roles: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'role_type', 'description'],
          properties: {
            name: { type: 'string' },
            role_type: { type: 'string', enum: ['human', 'ai', 'automation'] },
            description: { type: 'string' },
          },
        },
      },
      artifacts: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'artifact_type', 'produced_after_stage', 'consumed_by_stage'],
          properties: {
            name: { type: 'string' },
            artifact_type: { type: 'string' },
            produced_after_stage: { type: 'string' },
            consumed_by_stage: { type: 'string' },
          },
        },
      },
      triggers: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'trigger_type', 'signal_source'],
          properties: {
            name: { type: 'string' },
            trigger_type: {
              type: 'string',
              enum: ['signal', 'scheduled', 'manual', 'threshold'],
            },
            signal_source: { type: 'string' },
          },
        },
      },
      decisions: {
        type: 'array',
        items: {
          type: 'object',
          required: ['at_stage', 'question', 'true_path', 'false_path', 'confidence'],
          properties: {
            at_stage: { type: 'string' },
            question: { type: 'string' },
            true_path: { type: 'string' },
            false_path: { type: 'string' },
            confidence: { type: 'number' },
          },
        },
      },
      bottlenecks: {
        type: 'array',
        items: { type: 'string' },
      },
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
      confidence_scores: {
        type: 'object',
        properties: {
          north_star: { type: 'number' },
          pipelines: { type: 'number' },
          roles: { type: 'number' },
          artifacts: { type: 'number' },
          triggers: { type: 'number' },
          decisions: { type: 'number' },
        },
      },
    },
  },
}

const SYSTEM_PROMPT = `You are the Context Parser for Operation-Architect.

You receive the COMPLETE intake dataset: Wave 1 + all discovery answers. This is the final parse.

Rules:
1. Extract ONLY what was explicitly described. Never invent.
2. Maximum 5 pipelines. Consolidate if more emerge.
3. Every stage must have owner_role if one was identified.
4. Artifacts are handoff objects between stages — infer if not named, but mark as inference.
5. For anything inferred rather than extracted, add to inferences array with requires_confirmation: true.
6. Confidence scores must be honest. Vague = 0.3-0.5. Explicit = 0.8-1.0.
7. Accuracy matters more than completeness.`

function validateOutput(output: ContextParserOutput): { passed: boolean; errors: string[] } {
  const errors: string[] = []
  if (!output.north_star?.trim()) errors.push('north_star is empty')
  const totalStages = output.pipelines.reduce((sum, p) => sum + p.stages.length, 0)
  if (totalStages < 3) errors.push(`Minimum 3 stages required, got ${totalStages}`)
  if (output.roles.length === 0) errors.push('At least 1 role must be identified')
  if (output.triggers.length === 0) errors.push('At least 1 trigger must be identified')
  if (output.pipelines.length > 5) errors.push(`Maximum 5 pipelines, got ${output.pipelines.length}`)
  return { passed: errors.length === 0, errors }
}

export async function parseFullContext(params: {
  wave1: Record<Wave1QuestionKey, string>
  discoveryAnswers: Array<{ question: string; answer: string; type: string }>
  confirmedInferences: Array<{ primitive_type: string; value: string }>
}): Promise<ContextParserOutput> {

  const discoverySection = params.discoveryAnswers.length > 0
    ? `\nDISCOVERY ANSWERS:\n${params.discoveryAnswers
        .map((d) => `[${d.type}] Q: ${d.question}\nA: ${d.answer}`)
        .join('\n\n')}`
    : '\nDISCOVERY ANSWERS: None provided.'

  const inferencesSection = params.confirmedInferences.length > 0
    ? `\nCONFIRMED INFERENCES:\n${params.confirmedInferences
        .map((i) => `${i.primitive_type}: ${i.value}`)
        .join('\n')}`
    : ''

  const userMessage = `Complete intake dataset:

WAVE 1:
Org Goal: ${params.wave1.org_goal}
Primary Customer: ${params.wave1.primary_customer}
Value Delivery: ${params.wave1.value_delivery}
Value Moment: ${params.wave1.value_moment}
Value Journey: ${params.wave1.value_journey}
Team Roles: ${params.wave1.team_roles}
Bottleneck: ${params.wave1.bottleneck}
${discoverySection}
${inferencesSection}

Parse the complete operational model now.`

  const response = await callClaude(
    [{ role: 'user', content: userMessage }],
    [PARSE_CONTEXT_TOOL],
    SYSTEM_PROMPT
  )

  const raw = extractToolResult(response, 'parse_full_organizational_context')
  if (!raw) throw new Error('Context parser: no tool_use result returned')

  const output = raw as unknown as ContextParserOutput
  output.validation = validateOutput(output)
  return output
}
