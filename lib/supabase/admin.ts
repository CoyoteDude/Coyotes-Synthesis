import { createClient } from '@/lib/supabase/server'

// True only for a signed-in user listed in public.admin_users.
// Database RLS enforces the same rule; this just decides what UI to show.
export async function getIsAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase.rpc('is_admin')
  if (error) return false
  return data === true
}
