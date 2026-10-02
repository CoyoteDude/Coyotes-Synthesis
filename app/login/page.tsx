import { AppShell } from '@/components/app-shell'
import { LoginForm } from '@/components/login-form'
import { getIsAdmin } from '@/lib/supabase/admin'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const isAdmin = await getIsAdmin()

  // Only allow redirecting back to a path on this site.
  const redirectTo = next && next.startsWith('/') && !next.startsWith('//') ? next : '/'

  return (
    <AppShell isAdmin={isAdmin}>
      <LoginForm redirectTo={redirectTo} />
    </AppShell>
  )
}
