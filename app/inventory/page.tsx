import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/app-shell'
import { InventoryManager } from '@/components/inventory-manager'

export default async function InventoryPage() {
  const supabase = await createClient()
  
  const [
    { data: chemicals },
    { data: syntheses }
  ] = await Promise.all([
    supabase
      .from('chemicals')
      .select('*')
      .order('name'),
    supabase
      .from('syntheses')
      .select(`
        id,
        name,
        synthesis_starting_materials (
          chemical_name,
          formula
        )
      `)
  ])

  const lowStockChemicals = chemicals?.filter(
    c => c.current_quantity <= c.minimum_quantity
  ) || []

  // Build a list of all unique chemicals used in syntheses
  const chemicalsUsedInSyntheses = new Set<string>()
  syntheses?.forEach(s => {
    s.synthesis_starting_materials?.forEach((m: { chemical_name: string }) => {
      chemicalsUsedInSyntheses.add(m.chemical_name.toLowerCase())
    })
  })

  return (
    <AppShell lowStockCount={lowStockChemicals.length}>
      <InventoryManager 
        initialChemicals={chemicals || []}
        lowStockChemicals={lowStockChemicals}
        chemicalsUsedInSyntheses={Array.from(chemicalsUsedInSyntheses)}
      />
    </AppShell>
  )
}
