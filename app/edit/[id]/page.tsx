import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getIsAdmin } from '@/lib/supabase/admin'
import { AppShell } from '@/components/app-shell'
import { AddSynthesisForm } from '@/components/add-synthesis-form'

export default async function EditSynthesisPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!(await getIsAdmin())) redirect(`/login?next=/edit/${id}`)

  const supabase = await createClient()

  const [
    { data: synthesis },
    { data: reactions },
    { data: starting_materials },
    { data: steps },
    { data: categories },
    { data: chemicals }
  ] = await Promise.all([
    supabase.from('syntheses').select('*').eq('id', id).maybeSingle(),
    supabase.from('synthesis_reactions').select('*').eq('synthesis_id', id).order('order_index'),
    supabase.from('synthesis_starting_materials').select('*').eq('synthesis_id', id),
    supabase.from('synthesis_steps').select('*').eq('synthesis_id', id).order('step_number'),
    supabase.from('categories').select('*').order('name'),
    supabase.from('chemicals').select('*').order('name')
  ])

  if (!synthesis) notFound()

  const lowStockChemicals = chemicals?.filter(
    c => c.current_quantity <= c.minimum_quantity
  ) || []

  return (
    <AppShell lowStockCount={lowStockChemicals.length} isAdmin>
      <AddSynthesisForm
        categories={categories || []}
        initial={{
          ...synthesis,
          reactions: reactions || [],
          starting_materials: starting_materials || [],
          steps: steps || []
        }}
      />
    </AppShell>
  )
}
