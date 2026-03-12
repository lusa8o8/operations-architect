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
  if (!orgId) {
    return NextResponse.json({ error: 'Session not found' }, { status: 400 })
  }

  await supabase
    .from('operational_models')
    .update({ status: 'archived' })
    .eq('org_id', orgId)
    .eq('status', 'confirmed')

  const { data: currentModel } = await supabase
    .from('operational_models')
    .select('id, version, model_graph')
    .eq('org_id', orgId)
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!currentModel) {
    return NextResponse.json({ error: 'No draft model found' }, { status: 400 })
  }

  const graph = currentModel.model_graph as any
  const updatedGraph = {
    ...graph,
    stages: confirmedStages ?? graph.stages,
    roles: confirmedRoles ?? graph.roles,
    triggers: confirmedTriggers ?? graph.triggers,
    corrections: corrections ?? {},
    confirmed_at: new Date().toISOString(),
  }

  const { data: versions } = await supabase
    .from('operational_models')
    .select('version')
    .eq('org_id', orgId)
    .order('version', { ascending: false })
    .limit(1)

  const nextVersion = (versions?.[0]?.version ?? 0) + 1

  await supabase
    .from('operational_models')
    .update({
      status: 'confirmed',
      version: nextVersion,
      model_graph: updatedGraph
    })
    .eq('id', currentModel.id)

  if (rejectedIds && rejectedIds.length > 0) {
    await supabase
      .from('inferred_primitives')
      .update({ status: 'rejected' })
      .in('id', rejectedIds)
  }

  await supabase
    .from('intake_sessions')
    .update({ status: 'completed' })
    .eq('id', sessionId)

  return NextResponse.json({ ok: true, version: nextVersion })
}
