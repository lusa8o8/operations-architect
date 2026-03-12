import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { parseContext } from '@/lib/engines/context-parser'

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

  const { sessionId } = await request.json()
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: responses } = await supabase
    .from('intake_responses')
    .select('question_key, response_text')
    .eq('session_id', sessionId)

  if (!responses || responses.length === 0) {
    return NextResponse.json({ error: 'No responses found' }, { status: 400 })
  }

  const { data: sessionData } = await supabase
    .from('intake_sessions')
    .select('org_id')
    .eq('id', sessionId)
    .single()

  const responseMap: Record<string, string> = {}
  responses.forEach(r => { responseMap[r.question_key] = r.response_text })

  const result = await parseContext(responseMap, sessionData!.org_id, sessionId)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, primitives: result.primitives })
}
