// ============================================================
// OPERATION-ARCHITECT — Sketch Generator
// Runs immediately after Wave 1. No Claude call — fast.
// Identifies what primitives are present vs missing.
// Returns a skeleton pipeline and gap report.
// North Star: give the CEO something real to look at
// within seconds of completing Wave 1.
// ============================================================

import type { Wave1QuestionKey, QuestionType, Priority } from '@/lib/types'

export interface SketchStage {
  name: string
  order: number
  confidence: 'high' | 'medium' | 'low'
}

export interface PipelineSketch {
  name: string
  stages: SketchStage[]
}

export interface PrimitiveGap {
  primitive_type: QuestionType
  priority: Priority
  reason: string
}

export interface SketchResult {
  pipelines: PipelineSketch[]
  roles: string[]
  bottlenecks: string[]
  gaps: PrimitiveGap[]
  completeness_score: number
}

export function generateSketch(
  responses: Record<Wave1QuestionKey, string>
): SketchResult {
  const journey = responses.value_journey ?? ''
  const roles_raw = responses.team_roles ?? ''
  const bottleneck = responses.bottleneck ?? ''
  const value_moment = responses.value_moment ?? ''

  // Extract stages from journey narrative
  const stageTokens = journey
    .split(/→|->|\n|,|\d+\.|•/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2 && s.length < 80)

  const stages: SketchStage[] = stageTokens.slice(0, 8).map((name, i) => ({
    name,
    order: i + 1,
    confidence: i < 3 ? 'high' : 'medium',
  }))

  if (stages.length < 2) {
    stages.push(
      { name: 'Discovery', order: 1, confidence: 'low' },
      { name: 'Engagement', order: 2, confidence: 'low' },
      { name: 'Value Delivery', order: 3, confidence: 'low' }
    )
  }

  const roles = roles_raw
    .split(/,|\n|•/)
    .map((r) => r.trim())
    .filter((r) => r.length > 1 && r.length < 50)

  const gaps: PrimitiveGap[] = []

  const hasTrigger =
    value_moment.length > 10 &&
    /when|before|after|during|upon|once/i.test(value_moment)
  if (!hasTrigger) {
    gaps.push({
      primitive_type: 'trigger_signal',
      priority: 'high',
      reason: 'Value moment did not clearly identify a trigger event',
    })
  }

  const hasEntryPoint =
    /discover|find|hear|see|referral|search|social|campaign/i.test(journey)
  if (!hasEntryPoint) {
    gaps.push({
      primitive_type: 'entry_point',
      priority: 'high',
      reason: 'Value journey did not describe how customers first encounter the organization',
    })
  }

  gaps.push({
    primitive_type: 'artifact',
    priority: 'high',
    reason: 'Handoff objects between stages have not been identified yet',
  })

  const hasDecision =
    /if|decide|choose|opt|upgrade|convert|yes|no/i.test(journey)
  if (!hasDecision) {
    gaps.push({
      primitive_type: 'decision_point',
      priority: 'medium',
      reason: 'No branch points or conversion decisions identified in the journey',
    })
  }

  gaps.push({
    primitive_type: 'capacity',
    priority: 'medium',
    reason: 'Team capacity constraints have not been captured',
  })

  if (roles.length < 2) {
    gaps.push({
      primitive_type: 'ownership',
      priority: 'high',
      reason: 'Team roles are insufficient to assign stage ownership',
    })
  }

  const highGaps = gaps.filter((g) => g.priority === 'high').length
  const completeness_score = Math.max(0.1, (6 - highGaps) / 6)

  return {
    pipelines: [{ name: 'Master Pipeline', stages }],
    roles,
    bottlenecks: bottleneck
      .split(/,|\n|•/)
      .map((b) => b.trim())
      .filter((b) => b.length > 2),
    gaps,
    completeness_score,
  }
}
