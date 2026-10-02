import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/app-shell'
import { AddSynthesisForm } from '@/components/add-synthesis-form'

export default async function AddSynthesisPage() {
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
    <AppShell lowStockCount={lowStockChemicals.length}>
      <AddSynthesisForm categories={categories || []} />
    </AppShell>
  )
}
