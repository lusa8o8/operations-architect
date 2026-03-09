import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IntakePage } from '@/components/intake/IntakePage'

export default async function IntakeRoute() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get or create org for this user
  let { data: org } = await supabase
    .from('organizations')
    .select('id, status')
    .eq('owner_id', user.id)
    .single()

  if (!org) {
    const { data: newOrg } = await supabase
      .from('organizations')
      .insert({ owner_id: user.id, name: 'My Organization' })
      .select('id, status')
      .single()
    org = newOrg
  }

  if (!org) redirect('/dashboard')

  return <IntakePage orgId={org.id} />
}
