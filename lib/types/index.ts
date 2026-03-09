// ============================================================
// OPERATION-ARCHITECT — Core Types
// mirrors the database schema exactly
// ============================================================

export type OrgStatus = 'onboarding' | 'active' | 'paused'
export type IntakeStatus = 'in_progress' | 'wave1_complete' | 'discovery_complete' | 'completed'
export type PipelineType = 'demand' | 'conversion' | 'delivery' | 'retention' | 'support'
export type PipelineStatus = 'draft' | 'active' | 'paused' | 'archived'
export type RoleType = 'human' | 'ai' | 'automation'
export type TriggerType = 'signal' | 'scheduled' | 'manual' | 'threshold'
export type StageStatus = 'active' | 'inactive'
export type ExecutionStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped'
export type HandoffStatus = 'pending' | 'in_transit' | 'completed' | 'failed'
export type FlagType = 'ownership_gap' | 'handoff_risk' | 'overload_risk' | 'missing_handoff_object' | 'orphan_stage'
export type Severity = 'high' | 'medium' | 'low'
export type InferredStatus = 'pending' | 'confirmed' | 'rejected'
export type PrimitiveType = 'trigger' | 'entry_point' | 'artifact' | 'decision' | 'capacity' | 'owner' | 'stage'
export type QuestionType = 'trigger_signal' | 'entry_point' | 'artifact' | 'decision_point' | 'capacity' | 'feedback_loop' | 'ownership'
export type Priority = 'high' | 'medium' | 'low'

export interface Organization {
  id: string
  owner_id: string
  name: string
  industry: string | null
  north_star: string | null
  primary_metric: string | null
  status: OrgStatus
  created_at: string
  updated_at: string
}

export interface IntakeSession {
  id: string
  org_id: string
  status: IntakeStatus
  context_version: number
  started_at: string
  completed_at: string | null
}

export interface IntakeResponse {
  id: string
  session_id: string
  question_key: string
  response_text: string | null
  response_structured: Record<string, unknown> | null
  confidence_score: number | null
  created_at: string
}

export interface DiscoveryQuestion {
  id: string
  session_id: string
  question_type: QuestionType
  question_text: string
  generated_reason: string | null
  priority: Priority
  answered: boolean
  created_at: string
}

export interface DiscoveryResponse {
  id: string
  question_id: string
  response_text: string | null
  response_structured: Record<string, unknown> | null
  confidence_score: number | null
  created_at: string
}

export interface InferredPrimitive {
  id: string
  org_id: string
  primitive_type: PrimitiveType
  source_response: string | null
  inferred_value: Record<string, unknown>
  confidence: number
  status: InferredStatus
  created_at: string
}

export interface Role {
  id: string
  org_id: string
  name: string
  description: string | null
  role_type: RoleType
  created_at: string
}

export interface Pipeline {
  id: string
  org_id: string
  name: string
  pipeline_type: PipelineType
  north_star_alignment_score: number | null
  status: PipelineStatus
  created_at: string
}

export interface PipelineStage {
  id: string
  pipeline_id: string
  stage_name: string
  stage_order: number
  trigger_type: TriggerType | null
  owner_role_id: string | null
  status: StageStatus
  created_at: string
}

export interface Artifact {
  id: string
  org_id: string
  name: string
  artifact_type: string | null
  produced_by_stage_id: string | null
  consumed_by_stage_id: string | null
  created_at: string
}

export interface BottleneckFlag {
  id: string
  org_id: string
  stage_id: string | null
  flag_type: FlagType
  severity: Severity
  description: string | null
  resolved_at: string | null
  created_at: string
}

export interface OperationalModel {
  id: string
  org_id: string
  version: number
  model_graph: Record<string, unknown>
  confidence_score: number | null
  created_at: string
}

// ============================================================
// WAVE 1 — The 7 universal intake question keys
// ============================================================
export const WAVE1_QUESTIONS = [
  'org_goal',
  'primary_customer',
  'value_delivery',
  'value_moment',
  'value_journey',
  'team_roles',
  'bottleneck',
] as const

export type Wave1QuestionKey = typeof WAVE1_QUESTIONS[number]

export const WAVE1_QUESTION_TEXT: Record<Wave1QuestionKey, string> = {
  org_goal: 'What is the main outcome your organization is trying to produce?',
  primary_customer: 'Who receives the value your organization produces?',
  value_delivery: 'What does your organization provide to them?',
  value_moment: 'When does someone decide to use your service?',
  value_journey: 'What usually happens between discovering you and receiving value?',
  team_roles: 'What roles currently exist in the organization?',
  bottleneck: 'Where does work usually slow down or become chaotic?',
}
