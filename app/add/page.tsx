import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getIsAdmin } from '@/lib/supabase/admin'
import { AppShell } from '@/components/app-shell'
import { AddSynthesisForm } from '@/components/add-synthesis-form'

export default async function AddSynthesisPage() {
  if (!(await getIsAdmin())) redirect('/login?next=/add')

  const supabase = await createClient()
  
  const [
    { data: categories },
    { data: chemicals }
  ] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    supabase.from('chemicals').select('*').order('name')
  ])

  const lowStockChemicals = chemicals?.filter(
    c => c.current_quantity <= c.minimum_quantity
  ) || []

  return (
    <AppShell lowStockCount={lowStockChemicals.length} isAdmin>
      <AddSynthesisForm categories={categories || []} />
    </AppShell>
  )
}
