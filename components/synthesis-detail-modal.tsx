'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { SynthesisWithDetails } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import {
  FlaskConical,
  Beaker,
  ListOrdered,
  AlertTriangle,
  Clock,
  Thermometer,
  FileDown,
  Download,
  Scale,
  Hash,
  Atom,
  ArrowRight,
} from 'lucide-react'

interface SynthesisDetailModalProps {
  synthesisId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const difficultyColors: Record<string, string> = {
  beginner: 'bg-success/10 text-success border-success/20',
  intermediate: 'bg-primary/10 text-primary border-primary/20',
  advanced: 'bg-warning/10 text-warning-foreground border-warning/20',
  expert: 'bg-destructive/10 text-destructive border-destructive/20',
}

async function fetchSynthesisDetails(id: string): Promise<SynthesisWithDetails | null> {
  const supabase = createClient()
  
  const [
    { data: synthesis },
    { data: reactions },
    { data: starting_materials },
    { data: steps }
  ] = await Promise.all([
    supabase
      .from('syntheses')
      .select('*, category:categories(*)')
      .eq('id', id)
      .single(),
    supabase
      .from('synthesis_reactions')
      .select('*')
      .eq('synthesis_id', id)
      .order('order_index'),
    supabase
      .from('synthesis_starting_materials')
      .select('*')
      .eq('synthesis_id', id),
    supabase
      .from('synthesis_steps')
      .select('*')
      .eq('synthesis_id', id)
      .order('step_number')
  ])

  if (!synthesis) return null

  return {
    ...synthesis,
    reactions: reactions || [],
    starting_materials: starting_materials || [],
    steps: steps || []
  }
}

export function SynthesisDetailModal({ synthesisId, open, onOpenChange }: SynthesisDetailModalProps) {
  const { data: synthesis, isLoading } = useSWR(
    synthesisId && open ? `synthesis-${synthesisId}` : null,
    () => fetchSynthesisDetails(synthesisId!),
    { revalidateOnFocus: false }
  )

  const handleExportPDF = async () => {
    if (!synthesis) return
    window.open(`/api/export-pdf/${synthesis.id}`, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        ) : synthesis ? (
          <>
            <DialogHeader className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="text-xl font-bold text-balance">
                    {synthesis.name}
                  </DialogTitle>
                  {synthesis.formula && (
                    <p className="mt-1 font-mono text-lg text-muted-foreground">
                      {synthesis.formula}
                    </p>
                  )}
                </div>
                <Button onClick={handleExportPDF} variant="outline" size="sm" className="gap-2 flex-shrink-0">
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
              </div>

              {/* Quick Info */}
              <div className="flex flex-wrap gap-3">
                {synthesis.difficulty && (
                  <Badge className={`capitalize ${difficultyColors[synthesis.difficulty]}`}>
                    {synthesis.difficulty}
                  </Badge>
                )}
                {synthesis.yield_percentage && (
                  <Badge variant="outline" className="gap-1">
                    <Scale className="h-3 w-3" />
                    {synthesis.yield_percentage}% yield
                  </Badge>
                )}
                {synthesis.total_time && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {synthesis.total_time}
                  </Badge>
                )}
                {synthesis.cas_number && (
                  <Badge variant="outline" className="gap-1">
                    <Hash className="h-3 w-3" />
                    CAS: {synthesis.cas_number}
                  </Badge>
                )}
                {synthesis.molecular_weight && (
                  <Badge variant="outline" className="gap-1">
                    <Atom className="h-3 w-3" />
                    MW: {synthesis.molecular_weight} g/mol
                  </Badge>
                )}
              </div>

              {/* Safety Notes */}
              {synthesis.safety_notes && (
                <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 text-warning-foreground" />
                  <div>
                    <p className="font-medium text-warning-foreground">Safety Warning</p>
                    <p className="mt-1 text-sm text-warning-foreground/90">{synthesis.safety_notes}</p>
                  </div>
                </div>
              )}
            </DialogHeader>

            <Tabs defaultValue="reactions" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="reactions" className="gap-2">
                  <FlaskConical className="h-4 w-4" />
                  Reactions
                </TabsTrigger>
                <TabsTrigger value="materials" className="gap-2">
                  <Beaker className="h-4 w-4" />
                  Materials
                </TabsTrigger>
                <TabsTrigger value="procedure" className="gap-2">
                  <ListOrdered className="h-4 w-4" />
                  Procedure
                </TabsTrigger>
              </TabsList>

              {/* Reactions Tab */}
              <TabsContent value="reactions" className="mt-4 space-y-4">
                {synthesis.reactions.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No reaction equations documented yet.
                    </CardContent>
                  </Card>
                ) : (
                  synthesis.reactions.map((reaction, index) => (
                    <Card key={reaction.id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                            {index + 1}
                          </span>
                          {reaction.reaction_type || 'Reaction'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Reaction Equation */}
                        <div className="rounded-lg bg-secondary/50 p-4">
                          <p className="font-mono text-sm leading-relaxed">
                            {reaction.reaction_equation}
                          </p>
                        </div>

                        {/* Reaction Details */}
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          {reaction.temperature && (
                            <div className="flex items-center gap-2 text-sm">
                              <Thermometer className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Temp:</span>
                              <span>{reaction.temperature}</span>
                            </div>
                          )}
                          {reaction.duration && (
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Duration:</span>
                              <span>{reaction.duration}</span>
                            </div>
                          )}
                          {reaction.catalyst && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Catalyst:</span>{' '}
                              <span>{reaction.catalyst}</span>
                            </div>
                          )}
                          {reaction.solvent && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Solvent:</span>{' '}
                              <span>{reaction.solvent}</span>
                            </div>
                          )}
                        </div>

                        {reaction.conditions && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Conditions:</span> {reaction.conditions}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Materials Tab */}
              <TabsContent value="materials" className="mt-4">
                {synthesis.starting_materials.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No starting materials documented yet.
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Starting Materials</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left">
                              <th className="pb-3 font-medium">Chemical</th>
                              <th className="pb-3 font-medium">Formula</th>
                              <th className="pb-3 font-medium">Amount</th>
                              <th className="pb-3 font-medium">Purity</th>
                              <th className="pb-3 font-medium">State</th>
                              <th className="pb-3 font-medium">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {synthesis.starting_materials.map((material) => (
                              <tr key={material.id} className="border-b last:border-0">
                                <td className="py-3 font-medium">{material.chemical_name}</td>
                                <td className="py-3 font-mono text-muted-foreground">
                                  {material.formula || '-'}
                                </td>
                                <td className="py-3">{material.amount || '-'}</td>
                                <td className="py-3">{material.purity || '-'}</td>
                                <td className="py-3 capitalize">{material.state || '-'}</td>
                                <td className="py-3 text-muted-foreground">
                                  {material.notes || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Procedure Tab */}
              <TabsContent value="procedure" className="mt-4 space-y-4">
                {synthesis.steps.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No step-by-step procedure documented yet.
                    </CardContent>
                  </Card>
                ) : (
                  synthesis.steps.map((step, index) => (
                    <Card key={step.id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-3 text-base">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                            {step.step_number}
                          </span>
                          {step.title || `Step ${step.step_number}`}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-foreground">{step.description}</p>

                        <div className="flex flex-wrap gap-4 text-sm">
                          {step.duration && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{step.duration}</span>
                            </div>
                          )}
                          {step.temperature && (
                            <div className="flex items-center gap-2">
                              <Thermometer className="h-4 w-4 text-muted-foreground" />
                              <span>{step.temperature}</span>
                            </div>
                          )}
                        </div>

                        {step.equipment && step.equipment.length > 0 && (
                          <div>
                            <p className="mb-2 text-sm font-medium text-muted-foreground">
                              Equipment:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {step.equipment.map((item, i) => (
                                <Badge key={i} variant="secondary">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {step.safety_warnings && step.safety_warnings.length > 0 && (
                          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-destructive">
                              <AlertTriangle className="h-4 w-4" />
                              Safety Warnings
                            </p>
                            <ul className="list-inside list-disc space-y-1 text-sm text-destructive/90">
                              {step.safety_warnings.map((warning, i) => (
                                <li key={i}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {step.tips && (
                          <div className="rounded-lg bg-accent/50 p-3">
                            <p className="text-sm font-medium text-accent-foreground">Tip:</p>
                            <p className="mt-1 text-sm text-accent-foreground/90">{step.tips}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>

            {/* Notes */}
            {synthesis.notes && (
              <div className="mt-6">
                <Separator className="mb-4" />
                <h4 className="mb-2 font-medium text-foreground">Additional Notes</h4>
                <p className="text-sm text-muted-foreground">{synthesis.notes}</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">Synthesis not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
