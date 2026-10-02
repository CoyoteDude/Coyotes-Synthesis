'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Chemical } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  Plus,
  Minus,
  AlertTriangle,
  Package,
  MapPin,
  FlaskConical,
  ArrowUpDown,
  Edit,
  Trash2,
} from 'lucide-react'

interface InventoryManagerProps {
  initialChemicals: Chemical[]
  lowStockChemicals: Chemical[]
  chemicalsUsedInSyntheses: string[]
  isAdmin?: boolean
}

type SortField = 'name' | 'current_quantity' | 'minimum_quantity' | 'location'
type SortDirection = 'asc' | 'desc'

export function InventoryManager({
  initialChemicals,
  lowStockChemicals,
  chemicalsUsedInSyntheses,
  isAdmin = false,
}: InventoryManagerProps) {
  const router = useRouter()
  const [chemicals, setChemicals] = useState(initialChemicals)
  const [search, setSearch] = useState('')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  
  // Modal states
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [addChemicalModalOpen, setAddChemicalModalOpen] = useState(false)
  const [selectedChemical, setSelectedChemical] = useState<Chemical | null>(null)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add')
  const [adjustReason, setAdjustReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // New chemical form
  const [newChemical, setNewChemical] = useState({
    name: '',
    formula: '',
    cas_number: '',
    molecular_weight: '',
    state: '',
    purity: '',
    current_quantity: '',
    unit: 'g',
    minimum_quantity: '',
    location: '',
    storage_conditions: '',
  })

  const filteredAndSortedChemicals = useMemo(() => {
    let filtered = chemicals.filter((chemical) => {
      const matchesSearch =
        search === '' ||
        chemical.name.toLowerCase().includes(search.toLowerCase()) ||
        chemical.formula?.toLowerCase().includes(search.toLowerCase()) ||
        chemical.cas_number?.toLowerCase().includes(search.toLowerCase()) ||
        chemical.location?.toLowerCase().includes(search.toLowerCase())

      const matchesLowStock =
        !showLowStockOnly || chemical.current_quantity <= chemical.minimum_quantity

      return matchesSearch && matchesLowStock
    })

    filtered.sort((a, b) => {
      let aValue: string | number = ''
      let bValue: string | number = ''

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'current_quantity':
          aValue = a.current_quantity
          bValue = b.current_quantity
          break
        case 'minimum_quantity':
          aValue = a.minimum_quantity
          bValue = b.minimum_quantity
          break
        case 'location':
          aValue = (a.location || '').toLowerCase()
          bValue = (b.location || '').toLowerCase()
          break
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [chemicals, search, showLowStockOnly, sortField, sortDirection])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const openAdjustModal = (chemical: Chemical, type: 'add' | 'remove') => {
    setSelectedChemical(chemical)
    setAdjustType(type)
    setAdjustAmount('')
    setAdjustReason('')
    setAdjustModalOpen(true)
  }

  const handleAdjustInventory = async () => {
    if (!selectedChemical || !adjustAmount) return

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const amount = parseFloat(adjustAmount)
      const previousQty = selectedChemical.current_quantity
      const newQty = adjustType === 'add' 
        ? previousQty + amount 
        : Math.max(0, previousQty - amount)

      // Update chemical quantity
      const { error: updateError } = await supabase
        .from('chemicals')
        .update({ 
          current_quantity: newQty,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedChemical.id)

      if (updateError) throw updateError

      // Log the transaction
      const { error: logError } = await supabase
        .from('inventory_log')
        .insert({
          chemical_id: selectedChemical.id,
          transaction_type: adjustType,
          quantity: amount,
          previous_quantity: previousQty,
          new_quantity: newQty,
          reason: adjustReason || null,
        })

      if (logError) throw logError

      // Update local state
      setChemicals(chemicals.map(c => 
        c.id === selectedChemical.id 
          ? { ...c, current_quantity: newQty }
          : c
      ))

      setAdjustModalOpen(false)
      router.refresh()
    } catch (error) {
      console.error('Error adjusting inventory:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddChemical = async () => {
    if (!newChemical.name) return

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('chemicals')
        .insert({
          name: newChemical.name,
          formula: newChemical.formula || null,
          cas_number: newChemical.cas_number || null,
          molecular_weight: newChemical.molecular_weight ? parseFloat(newChemical.molecular_weight) : null,
          state: newChemical.state || null,
          purity: newChemical.purity || null,
          current_quantity: parseFloat(newChemical.current_quantity) || 0,
          unit: newChemical.unit,
          minimum_quantity: parseFloat(newChemical.minimum_quantity) || 0,
          location: newChemical.location || null,
          storage_conditions: newChemical.storage_conditions || null,
        })
        .select()
        .single()

      if (error) throw error

      setChemicals([...chemicals, data])
      setAddChemicalModalOpen(false)
      setNewChemical({
        name: '',
        formula: '',
        cas_number: '',
        molecular_weight: '',
        state: '',
        purity: '',
        current_quantity: '',
        unit: 'g',
        minimum_quantity: '',
        location: '',
        storage_conditions: '',
      })
      router.refresh()
    } catch (error) {
      console.error('Error adding chemical:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLowStock = (chemical: Chemical) => chemical.current_quantity <= chemical.minimum_quantity
  const isUsedInSyntheses = (chemical: Chemical) => 
    chemicalsUsedInSyntheses.includes(chemical.name.toLowerCase())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chemical Inventory</h1>
          <p className="text-sm text-muted-foreground">
            {chemicals.length} chemicals in stock
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setAddChemicalModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Chemical
          </Button>
        )}
      </div>

      {/* Low Stock Warnings */}
      {lowStockChemicals.length > 0 && (
        <Card className="border-warning/50 bg-warning/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-warning-foreground">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Warning
            </CardTitle>
            <CardDescription className="text-warning-foreground/80">
              {lowStockChemicals.length} chemical(s) are below minimum stock levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockChemicals.map((chemical) => (
                <Badge 
                  key={chemical.id} 
                  variant="outline" 
                  className="border-warning/50 bg-warning/20 text-warning-foreground"
                >
                  {chemical.name}: {chemical.current_quantity} / {chemical.minimum_quantity} {chemical.unit}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, formula, CAS, or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={showLowStockOnly ? 'default' : 'outline'}
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className="gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Low Stock Only
              {lowStockChemicals.length > 0 && (
                <Badge variant={showLowStockOnly ? 'secondary' : 'destructive'} className="ml-1">
                  {lowStockChemicals.length}
                </Badge>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Chemical
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Formula</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleSort('current_quantity')}
                  >
                    <div className="flex items-center gap-2">
                      Quantity
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Min. Level</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleSort('location')}
                  >
                    <div className="flex items-center gap-2">
                      Location
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>State</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedChemicals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8">
                      <Package className="mx-auto h-8 w-8 text-muted-foreground/50" />
                      <p className="mt-2 text-muted-foreground">No chemicals found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedChemicals.map((chemical) => (
                    <TableRow 
                      key={chemical.id}
                      className={isLowStock(chemical) ? 'bg-warning/5' : ''}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{chemical.name}</span>
                          {isLowStock(chemical) && (
                            <AlertTriangle className="h-4 w-4 text-warning-foreground" />
                          )}
                          {isUsedInSyntheses(chemical) && (
                            <FlaskConical className="h-4 w-4 text-primary" title="Used in syntheses" />
                          )}
                        </div>
                        {chemical.cas_number && (
                          <p className="text-xs text-muted-foreground">
                            CAS: {chemical.cas_number}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {chemical.formula || '-'}
                      </TableCell>
                      <TableCell>
                        <span className={isLowStock(chemical) ? 'text-destructive font-medium' : ''}>
                          {chemical.current_quantity} {chemical.unit}
                        </span>
                      </TableCell>
                      <TableCell>
                        {chemical.minimum_quantity} {chemical.unit}
                      </TableCell>
                      <TableCell>
                        {chemical.location ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{chemical.location}</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="capitalize">
                        {chemical.state || '-'}
                      </TableCell>
                      {isAdmin && (
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                            onClick={() => openAdjustModal(chemical, 'add')}
                            title="Add stock"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => openAdjustModal(chemical, 'remove')}
                            title="Remove stock"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Adjust Inventory Modal */}
      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustType === 'add' ? 'Add Stock' : 'Remove Stock'}
            </DialogTitle>
            <DialogDescription>
              {selectedChemical?.name} - Current: {selectedChemical?.current_quantity} {selectedChemical?.unit}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount ({selectedChemical?.unit})</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter amount"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Input
                placeholder="e.g., Synthesis batch, New order, Spillage"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              />
            </div>
            {adjustAmount && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="text-muted-foreground">
                  New quantity will be:{' '}
                  <span className="font-medium text-foreground">
                    {adjustType === 'add'
                      ? (selectedChemical?.current_quantity || 0) + parseFloat(adjustAmount || '0')
                      : Math.max(0, (selectedChemical?.current_quantity || 0) - parseFloat(adjustAmount || '0'))
                    } {selectedChemical?.unit}
                  </span>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAdjustInventory}
              disabled={isSubmitting || !adjustAmount}
              className={adjustType === 'add' ? 'bg-success hover:bg-success/90' : ''}
              variant={adjustType === 'remove' ? 'destructive' : 'default'}
            >
              {isSubmitting ? <Spinner className="h-4 w-4" /> : null}
              {adjustType === 'add' ? 'Add Stock' : 'Remove Stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Chemical Modal */}
      <Dialog open={addChemicalModalOpen} onOpenChange={setAddChemicalModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Chemical</DialogTitle>
            <DialogDescription>
              Add a new chemical to your inventory
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Chemical Name *</Label>
              <Input
                placeholder="e.g., Sodium Chloride"
                value={newChemical.name}
                onChange={(e) => setNewChemical({ ...newChemical, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Formula</Label>
              <Input
                placeholder="e.g., NaCl"
                value={newChemical.formula}
                onChange={(e) => setNewChemical({ ...newChemical, formula: e.target.value })}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>CAS Number</Label>
              <Input
                placeholder="e.g., 7647-14-5"
                value={newChemical.cas_number}
                onChange={(e) => setNewChemical({ ...newChemical, cas_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Molecular Weight (g/mol)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g., 58.44"
                value={newChemical.molecular_weight}
                onChange={(e) => setNewChemical({ ...newChemical, molecular_weight: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Select
                value={newChemical.state}
                onValueChange={(value) => setNewChemical({ ...newChemical, state: value })}
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
            <div className="space-y-2">
              <Label>Purity</Label>
              <Input
                placeholder="e.g., ≥99%"
                value={newChemical.purity}
                onChange={(e) => setNewChemical({ ...newChemical, purity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Current Quantity</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={newChemical.current_quantity}
                  onChange={(e) => setNewChemical({ ...newChemical, current_quantity: e.target.value })}
                />
                <Select
                  value={newChemical.unit}
                  onValueChange={(value) => setNewChemical({ ...newChemical, unit: value })}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="mg">mg</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="mL">mL</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Minimum Quantity</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={newChemical.minimum_quantity}
                onChange={(e) => setNewChemical({ ...newChemical, minimum_quantity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Storage Location</Label>
              <Input
                placeholder="e.g., Cabinet A-1"
                value={newChemical.location}
                onChange={(e) => setNewChemical({ ...newChemical, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Storage Conditions</Label>
              <Input
                placeholder="e.g., Room temperature, dry"
                value={newChemical.storage_conditions}
                onChange={(e) => setNewChemical({ ...newChemical, storage_conditions: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddChemicalModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddChemical} disabled={isSubmitting || !newChemical.name}>
              {isSubmitting ? <Spinner className="h-4 w-4" /> : null}
              Add Chemical
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
