import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { extractDiscoveryBottlenecks } from '@/lib/engines/discovery-generator'

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

  const { questionId, responseText, isLast, sessionId } = await request.json()
  if (!questionId || !responseText) {
    return NextResponse.json({ error: 'questionId and responseText required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase
    .from('discovery_responses')
    .insert({ question_id: questionId, response_text: responseText })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (isLast && sessionId) {
    const { data: sessionData } = await supabase
      .from('intake_sessions')
      .select('org_id')
      .eq('id', sessionId)
      .single()

    if (sessionData?.org_id) {
      const { data: model } = await supabase
        .from('operational_models')
        .select('model_graph')
        .eq('org_id', sessionData.org_id)
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const existingBottlenecks = (model?.model_graph as any)?.bottlenecks ?? []

      await extractDiscoveryBottlenecks(sessionId, sessionData.org_id, existingBottlenecks)
    }
  }

  return NextResponse.json({ ok: true })
}
