import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { checkConsistency } from '@/lib/engines/consistency-checker'

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

  const result = await checkConsistency(
    { stages: original?.stages, roles: original?.roles, triggers: original?.triggers },
    { stages: confirmedStages, roles: confirmedRoles, triggers: confirmedTriggers }
  )

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json(result.result)
}
