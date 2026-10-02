'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { mutate } from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Category, SynthesisWithDetails } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  FlaskConical,
  Plus,
  Trash2,
  Beaker,
  ListOrdered,
  AlertTriangle,
  Save,
  ArrowRight,
  Info,
} from 'lucide-react'

interface AddSynthesisFormProps {
  categories: Category[]
  // When set, the form edits this protocol instead of creating a new one.
  initial?: SynthesisWithDetails
}

interface ReactionForm {
  reaction_equation: string
  reaction_type: string
  conditions: string
  temperature: string
  pressure: string
  duration: string
  catalyst: string
  solvent: string
}

interface MaterialForm {
  chemical_name: string
  formula: string
  cas_number: string
  amount: string
  purity: string
  state: string
  notes: string
}

interface StepForm {
  title: string
  description: string
  duration: string
  temperature: string
  equipment: string
  safety_warnings: string
  tips: string
}

const emptyReaction: ReactionForm = {
  reaction_equation: '',
  reaction_type: '',
  conditions: '',
  temperature: '',
  pressure: '',
  duration: '',
  catalyst: '',
  solvent: '',
}

const emptyMaterial: MaterialForm = {
  chemical_name: '',
  formula: '',
  cas_number: '',
  amount: '',
  purity: '',
  state: '',
  notes: '',
}

const emptyStep: StepForm = {
  title: '',
  description: '',
  duration: '',
  temperature: '',
  equipment: '',
  safety_warnings: '',
  tips: '',
}

function initialReactions(initial?: SynthesisWithDetails): ReactionForm[] {
  if (!initial?.reactions.length) return [{ ...emptyReaction }]
  return initial.reactions.map((r) => ({
    reaction_equation: r.reaction_equation,
    reaction_type: r.reaction_type ?? '',
    conditions: r.conditions ?? '',
    temperature: r.temperature ?? '',
    pressure: r.pressure ?? '',
    duration: r.duration ?? '',
    catalyst: r.catalyst ?? '',
    solvent: r.solvent ?? '',
  }))
}

function initialMaterials(initial?: SynthesisWithDetails): MaterialForm[] {
  if (!initial?.starting_materials.length) return [{ ...emptyMaterial }]
  return initial.starting_materials.map((m) => ({
    chemical_name: m.chemical_name,
    formula: m.formula ?? '',
    cas_number: m.cas_number ?? '',
    amount: m.amount ?? '',
    purity: m.purity ?? '',
    state: m.state ?? '',
    notes: m.notes ?? '',
  }))
}

function initialSteps(initial?: SynthesisWithDetails): StepForm[] {
  if (!initial?.steps.length) return [{ ...emptyStep }]
  return initial.steps.map((st) => ({
    title: st.title ?? '',
    description: st.description,
    duration: st.duration ?? '',
    temperature: st.temperature ?? '',
    equipment: st.equipment?.join(', ') ?? '',
    safety_warnings: st.safety_warnings?.join(', ') ?? '',
    tips: st.tips ?? '',
  }))
}

const splitList = (value: string) => {
  const items = value.split(',').map((v) => v.trim()).filter(Boolean)
  return items.length > 0 ? items : null
}

export function AddSynthesisForm({ categories, initial }: AddSynthesisFormProps) {
  const router = useRouter()
  const isEditing = !!initial
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Basic info
  const [name, setName] = useState(initial?.name ?? '')
  const [formula, setFormula] = useState(initial?.formula ?? '')
  const [molecularWeight, setMolecularWeight] = useState(initial?.molecular_weight?.toString() ?? '')
  const [casNumber, setCasNumber] = useState(initial?.cas_number ?? '')
  const [structureSmiles, setStructureSmiles] = useState(initial?.structure_smiles ?? '')
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? '')
  const [difficulty, setDifficulty] = useState<string>(initial?.difficulty ?? '')
  const [yieldPercentage, setYieldPercentage] = useState(initial?.yield_percentage?.toString() ?? '')
  const [totalTime, setTotalTime] = useState(initial?.total_time ?? '')
  const [safetyNotes, setSafetyNotes] = useState(initial?.safety_notes ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  // Reactions
  const [reactions, setReactions] = useState<ReactionForm[]>(() => initialReactions(initial))

  // Starting Materials
  const [materials, setMaterials] = useState<MaterialForm[]>(() => initialMaterials(initial))

  // Steps
  const [steps, setSteps] = useState<StepForm[]>(() => initialSteps(initial))

  // Reaction handlers
  const addReaction = () => setReactions([...reactions, { ...emptyReaction }])
  const removeReaction = (index: number) => {
    if (reactions.length > 1) {
      setReactions(reactions.filter((_, i) => i !== index))
    }
  }
  const updateReaction = (index: number, field: keyof ReactionForm, value: string) => {
    const updated = [...reactions]
    updated[index] = { ...updated[index], [field]: value }
    setReactions(updated)
  }

  // Material handlers
  const addMaterial = () => setMaterials([...materials, { ...emptyMaterial }])
  const removeMaterial = (index: number) => {
    if (materials.length > 1) {
      setMaterials(materials.filter((_, i) => i !== index))
    }
  }
  const updateMaterial = (index: number, field: keyof MaterialForm, value: string) => {
    const updated = [...materials]
    updated[index] = { ...updated[index], [field]: value }
    setMaterials(updated)
  }

  // Step handlers
  const addStep = () => setSteps([...steps, { ...emptyStep }])
  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index))
    }
  }
  const updateStep = (index: number, field: keyof StepForm, value: string) => {
    const updated = [...steps]
    updated[index] = { ...updated[index], [field]: value }
    setSteps(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()

      // Saved in one database transaction (see save_synthesis in supabase/migrations).
      const { error: saveError } = await supabase.rpc('save_synthesis', {
        p_id: initial?.id ?? null,
        p_synthesis: {
          name,
          formula: formula || null,
          molecular_weight: molecularWeight ? parseFloat(molecularWeight) : null,
          cas_number: casNumber || null,
          structure_smiles: structureSmiles || null,
          category_id: categoryId || null,
          difficulty: difficulty || null,
          yield_percentage: yieldPercentage ? parseFloat(yieldPercentage) : null,
          total_time: totalTime || null,
          safety_notes: safetyNotes || null,
          notes: notes || null,
        },
        p_reactions: reactions
          .filter(r => r.reaction_equation.trim())
          .map((r, index) => ({
            reaction_equation: r.reaction_equation,
            reaction_type: r.reaction_type || null,
            conditions: r.conditions || null,
            temperature: r.temperature || null,
            pressure: r.pressure || null,
            duration: r.duration || null,
            catalyst: r.catalyst || null,
            solvent: r.solvent || null,
            order_index: index,
          })),
        p_materials: materials
          .filter(m => m.chemical_name.trim())
          .map((m) => ({
            chemical_name: m.chemical_name,
            formula: m.formula || null,
            cas_number: m.cas_number || null,
            amount: m.amount || null,
            purity: m.purity || null,
            state: m.state || null,
            notes: m.notes || null,
          })),
        p_steps: steps
          .filter(st => st.description.trim())
          .map((st, index) => ({
            step_number: index + 1,
            title: st.title || null,
            description: st.description,
            duration: st.duration || null,
            temperature: st.temperature || null,
            equipment: splitList(st.equipment),
            safety_warnings: splitList(st.safety_warnings),
            tips: st.tips || null,
          })),
      })

      if (saveError) throw saveError

      // Drop the cached copy the detail view keeps, so it shows the new version.
      if (initial) await mutate(`synthesis-${initial.id}`, undefined, { revalidate: false })

      router.push('/')
      router.refresh()
    } catch (err) {
      console.error('Error saving synthesis:', err)
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : null
      setError(message || 'Failed to save synthesis')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEditing ? 'Edit Synthesis' : 'Add New Synthesis'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? `Update the protocol for ${initial.name}`
              : 'Create a new synthesis protocol with detailed steps and materials'}
          </p>
        </div>
        <Button type="submit" disabled={isSubmitting || !name.trim()} className="gap-2">
          {isSubmitting ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isEditing ? 'Save Changes' : 'Save Protocol'}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Basic Information
          </CardTitle>
          <CardDescription>
            Enter the fundamental details about this synthesis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Chemical Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Aspirin (Acetylsalicylic Acid)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="formula">Molecular Formula</Label>
              <Input
                id="formula"
                placeholder="e.g., C9H8O4"
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="molecularWeight">Molecular Weight (g/mol)</Label>
              <Input
                id="molecularWeight"
                type="number"
                step="0.01"
                placeholder="e.g., 180.16"
                value={molecularWeight}
                onChange={(e) => setMolecularWeight(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="casNumber">CAS Number</Label>
              <Input
                id="casNumber"
                placeholder="e.g., 50-78-2"
                value={casNumber}
                onChange={(e) => setCasNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="structureSmiles">SMILES Structure</Label>
              <Input
                id="structureSmiles"
                placeholder="e.g., CC(=O)OC1=CC=CC=C1C(=O)O"
                value={structureSmiles}
                onChange={(e) => setStructureSmiles(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yieldPercentage">Expected Yield (%)</Label>
              <Input
                id="yieldPercentage"
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="e.g., 85"
                value={yieldPercentage}
                onChange={(e) => setYieldPercentage(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalTime">Total Time</Label>
              <Input
                id="totalTime"
                placeholder="e.g., 2-3 hours"
                value={totalTime}
                onChange={(e) => setTotalTime(e.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="safetyNotes" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning-foreground" />
                Safety Notes
              </Label>
              <Textarea
                id="safetyNotes"
                placeholder="Enter any safety warnings or precautions..."
                value={safetyNotes}
                onChange={(e) => setSafetyNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Enter any additional information about this synthesis..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5" />
                Reaction(s)
              </CardTitle>
              <CardDescription>
                Add one or more reaction equations. Format: {"\"H₂ (g) + O₂ (g) → H₂O (l)\""}
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addReaction} className="gap-1">
              <Plus className="h-4 w-4" />
              Add Reaction
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {reactions.map((reaction, index) => (
            <div key={index} className="space-y-4 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline">Reaction {index + 1}</Badge>
                {reactions.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeReaction(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Reaction Equation *</Label>
                <Input
                  placeholder='e.g., C7H6O3 (s) + C4H6O3 (l) → C9H8O4 (s) + CH3COOH (l)'
                  value={reaction.reaction_equation}
                  onChange={(e) => updateReaction(index, 'reaction_equation', e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Reaction Type</Label>
                  <Input
                    placeholder="e.g., Esterification"
                    value={reaction.reaction_type}
                    onChange={(e) => updateReaction(index, 'reaction_type', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temperature</Label>
                  <Input
                    placeholder="e.g., 85°C"
                    value={reaction.temperature}
                    onChange={(e) => updateReaction(index, 'temperature', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input
                    placeholder="e.g., 15-20 minutes"
                    value={reaction.duration}
                    onChange={(e) => updateReaction(index, 'duration', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pressure</Label>
                  <Input
                    placeholder="e.g., Atmospheric"
                    value={reaction.pressure}
                    onChange={(e) => updateReaction(index, 'pressure', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Catalyst</Label>
                  <Input
                    placeholder="e.g., H3PO4"
                    value={reaction.catalyst}
                    onChange={(e) => updateReaction(index, 'catalyst', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Solvent</Label>
                  <Input
                    placeholder="e.g., Water"
                    value={reaction.solvent}
                    onChange={(e) => updateReaction(index, 'solvent', e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Conditions</Label>
                  <Input
                    placeholder="e.g., Acidic conditions, reflux"
                    value={reaction.conditions}
                    onChange={(e) => updateReaction(index, 'conditions', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Starting Materials */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Beaker className="h-5 w-5" />
                Starting Materials
              </CardTitle>
              <CardDescription>
                List all chemicals and reagents needed for this synthesis
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addMaterial} className="gap-1">
              <Plus className="h-4 w-4" />
              Add Material
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {materials.map((material, index) => (
            <div key={index} className="space-y-4 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline">Material {index + 1}</Badge>
                {materials.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMaterial(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Chemical Name *</Label>
                  <Input
                    placeholder="e.g., Salicylic Acid"
                    value={material.chemical_name}
                    onChange={(e) => updateMaterial(index, 'chemical_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Formula</Label>
                  <Input
                    placeholder="e.g., C7H6O3"
                    value={material.formula}
                    onChange={(e) => updateMaterial(index, 'formula', e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CAS Number</Label>
                  <Input
                    placeholder="e.g., 69-72-7"
                    value={material.cas_number}
                    onChange={(e) => updateMaterial(index, 'cas_number', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    placeholder="e.g., 2.0 g"
                    value={material.amount}
                    onChange={(e) => updateMaterial(index, 'amount', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Purity</Label>
                  <Input
                    placeholder="e.g., ≥99%"
                    value={material.purity}
                    onChange={(e) => updateMaterial(index, 'purity', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Select
                    value={material.state}
                    onValueChange={(value) => updateMaterial(index, 'state', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Solid</SelectItem>
                      <SelectItem value="liquid">Liquid</SelectItem>
                      <SelectItem value="gas">Gas</SelectItem>
                      <SelectItem value="solution">Solution</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                  <Label>Notes</Label>
                  <Input
                    placeholder="e.g., White crystalline powder"
                    value={material.notes}
                    onChange={(e) => updateMaterial(index, 'notes', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Procedure Steps */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListOrdered className="h-5 w-5" />
                Procedure Steps
              </CardTitle>
              <CardDescription>
                Add step-by-step instructions for performing this synthesis
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addStep} className="gap-1">
              <Plus className="h-4 w-4" />
              Add Step
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {steps.map((step, index) => (
            <div key={index} className="space-y-4 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <Input
                    placeholder="Step title (optional)"
                    value={step.title}
                    onChange={(e) => updateStep(index, 'title', e.target.value)}
                    className="max-w-xs"
                  />
                </div>
                {steps.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStep(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  placeholder="Describe what to do in this step..."
                  value={step.description}
                  onChange={(e) => updateStep(index, 'description', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input
                    placeholder="e.g., 15 minutes"
                    value={step.duration}
                    onChange={(e) => updateStep(index, 'duration', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temperature</Label>
                  <Input
                    placeholder="e.g., 85°C"
                    value={step.temperature}
                    onChange={(e) => updateStep(index, 'temperature', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Equipment (comma-separated)</Label>
                  <Input
                    placeholder="e.g., Erlenmeyer flask, Hot plate, Thermometer"
                    value={step.equipment}
                    onChange={(e) => updateStep(index, 'equipment', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning-foreground" />
                    Safety Warnings (comma-separated)
                  </Label>
                  <Input
                    placeholder="e.g., Wear goggles, Use fume hood"
                    value={step.safety_warnings}
                    onChange={(e) => updateStep(index, 'safety_warnings', e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    Tips
                  </Label>
                  <Input
                    placeholder="Any helpful tips for this step..."
                    value={step.tips}
                    onChange={(e) => updateStep(index, 'tips', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !name.trim()} className="gap-2">
          {isSubmitting ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isEditing ? 'Save Changes' : 'Save Protocol'}
        </Button>
      </div>
    </form>
  )
}
