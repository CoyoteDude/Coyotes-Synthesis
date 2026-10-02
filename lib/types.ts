export interface Category {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface Synthesis {
  id: string
  name: string
  formula: string | null
  molecular_weight: number | null
  cas_number: string | null
  structure_image_url: string | null
  structure_smiles: string | null
  category_id: string | null
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null
  yield_percentage: number | null
  total_time: string | null
  safety_notes: string | null
  notes: string | null
  is_default: boolean
  created_at: string
  updated_at: string
  category?: Category
}

export interface SynthesisReaction {
  id: string
  synthesis_id: string
  reaction_equation: string
  reaction_type: string | null
  conditions: string | null
  temperature: string | null
  pressure: string | null
  duration: string | null
  catalyst: string | null
  solvent: string | null
  order_index: number
  created_at: string
}

export interface SynthesisStartingMaterial {
  id: string
  synthesis_id: string
  chemical_name: string
  formula: string | null
  cas_number: string | null
  amount: string | null
  purity: string | null
  state: 'solid' | 'liquid' | 'gas' | 'solution' | null
  notes: string | null
  created_at: string
}

export interface SynthesisStep {
  id: string
  synthesis_id: string
  step_number: number
  title: string | null
  description: string
  duration: string | null
  temperature: string | null
  equipment: string[] | null
  safety_warnings: string[] | null
  tips: string | null
  created_at: string
}

export interface Chemical {
  id: string
  name: string
  formula: string | null
  cas_number: string | null
  molecular_weight: number | null
  state: 'solid' | 'liquid' | 'gas' | 'solution' | null
  purity: string | null
  current_quantity: number
  unit: string
  minimum_quantity: number
  location: string | null
  supplier: string | null
  lot_number: string | null
  expiration_date: string | null
  safety_data_sheet_url: string | null
  hazard_symbols: string[] | null
  storage_conditions: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InventoryLog {
  id: string
  chemical_id: string
  transaction_type: 'add' | 'remove' | 'adjust' | 'expire'
  quantity: number
  previous_quantity: number | null
  new_quantity: number | null
  reason: string | null
  performed_by: string | null
  created_at: string
}

export interface SynthesisWithDetails extends Synthesis {
  reactions: SynthesisReaction[]
  starting_materials: SynthesisStartingMaterial[]
  steps: SynthesisStep[]
}

// Form types for creating new synthesis
export interface NewSynthesisForm {
  name: string
  formula: string
  molecular_weight: string
  cas_number: string
  structure_smiles: string
  category_id: string
  difficulty: string
  yield_percentage: string
  total_time: string
  safety_notes: string
  notes: string
  reactions: {
    reaction_equation: string
    reaction_type: string
    conditions: string
    temperature: string
    pressure: string
    duration: string
    catalyst: string
    solvent: string
  }[]
  starting_materials: {
    chemical_name: string
    formula: string
    cas_number: string
    amount: string
    purity: string
    state: string
    notes: string
  }[]
  steps: {
    title: string
    description: string
    duration: string
    temperature: string
    equipment: string
    safety_warnings: string
    tips: string
  }[]
}
