import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/app-shell'
import { SynthesisBrowser } from '@/components/synthesis-browser'

export default async function HomePage() {
  const supabase = await createClient()
  
  const [
    { data: syntheses },
    { data: categories },
    { data: chemicals }
  ] = await Promise.all([
    supabase
      .from('syntheses')
      .select('*, category:categories(*)')
      .order('name'),
    supabase
      .from('categories')
      .select('*')
      .order('name'),
    supabase
      .from('chemicals')
      .select('*')
      .order('name')
  ])

  const lowStockChemicals = chemicals?.filter(
    c => c.current_quantity <= c.minimum_quantity
  ) || []

  return (
    <AppShell lowStockCount={lowStockChemicals.length}>
      <SynthesisBrowser 
        initialSyntheses={syntheses || []}
        categories={categories || []}
      />
    </AppShell>
  )
}
