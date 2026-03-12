import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

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

  const { sessionId, confirmedStages, confirmedRoles, confirmedTriggers, rejectedIds, corrections } = await request.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: session } = await supabase
    .from('intake_sessions')
    .select('org_id')
    .eq('id', sessionId)
    .single()

  const orgId = session?.org_id

  if (rejectedIds && rejectedIds.length > 0) {
    await supabase
      .from('inferred_primitives')
      .update({ status: 'rejected' })
      .in('id', rejectedIds)
  }

  if (confirmedStages && confirmedStages.length > 0) {
    await supabase
      .from('inferred_primitives')
      .update({ status: 'confirmed' })
      .eq('org_id', orgId)
      .eq('primitive_type', 'stage')
  }

  const { data: currentModel } = await supabase
    .from('operational_models')
    .select('id, model_graph')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (currentModel) {
    const graph = currentModel.model_graph as any
    const updatedGraph = {
      ...graph,
      stages: confirmedStages ?? graph.stages,
      roles: confirmedRoles ?? graph.roles,
      triggers: confirmedTriggers ?? graph.triggers,
      corrections: corrections ?? {},
      confirmed_at: new Date().toISOString(),
    }

    await supabase
      .from('operational_models')
      .update({ model_graph: updatedGraph })
      .eq('id', currentModel.id)
  }

  await supabase
    .from('intake_sessions')
    .update({ status: 'completed' })
    .eq('id', sessionId)

  return NextResponse.json({ ok: true })
}
