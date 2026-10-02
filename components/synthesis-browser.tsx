'use client'

import { useState, useMemo } from 'react'
import { Synthesis, Category } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Filter,
  FlaskConical,
  Clock,
  Percent,
  AlertTriangle,
  ChevronRight,
  X,
} from 'lucide-react'
import { SynthesisDetailModal } from './synthesis-detail-modal'

interface SynthesisBrowserProps {
  initialSyntheses: (Synthesis & { category: Category | null })[]
  categories: Category[]
}

const difficultyColors: Record<string, string> = {
  beginner: 'bg-success/10 text-success border-success/20',
  intermediate: 'bg-primary/10 text-primary border-primary/20',
  advanced: 'bg-warning/10 text-warning-foreground border-warning/20',
  expert: 'bg-destructive/10 text-destructive border-destructive/20',
}

export function SynthesisBrowser({ initialSyntheses, categories }: SynthesisBrowserProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [selectedSynthesis, setSelectedSynthesis] = useState<Synthesis | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const filteredSyntheses = useMemo(() => {
    return initialSyntheses.filter((synthesis) => {
      const matchesSearch =
        search === '' ||
        synthesis.name.toLowerCase().includes(search.toLowerCase()) ||
        synthesis.formula?.toLowerCase().includes(search.toLowerCase()) ||
        synthesis.cas_number?.toLowerCase().includes(search.toLowerCase())

      const matchesCategory =
        selectedCategory === 'all' || synthesis.category_id === selectedCategory

      const matchesDifficulty =
        selectedDifficulty === 'all' || synthesis.difficulty === selectedDifficulty

      return matchesSearch && matchesCategory && matchesDifficulty
    })
  }, [initialSyntheses, search, selectedCategory, selectedDifficulty])

  const clearFilters = () => {
    setSearch('')
    setSelectedCategory('all')
    setSelectedDifficulty('all')
  }

  const hasActiveFilters = search !== '' || selectedCategory !== 'all' || selectedDifficulty !== 'all'

  const handleViewDetails = (synthesis: Synthesis) => {
    setSelectedSynthesis(synthesis)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Synthesis Database</h1>
          <p className="text-sm text-muted-foreground">
            {filteredSyntheses.length} of {initialSyntheses.length} protocols
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, formula, or CAS number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Difficulty Filter */}
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Grid */}
      {filteredSyntheses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FlaskConical className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium text-foreground">No syntheses found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your search or filters
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                Clear all filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSyntheses.map((synthesis) => (
            <Card
              key={synthesis.id}
              className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
              onClick={() => handleViewDetails(synthesis)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-semibold leading-tight text-balance">
                      {synthesis.name}
                    </CardTitle>
                    {synthesis.formula && (
                      <p className="mt-1 font-mono text-sm text-muted-foreground">
                        {synthesis.formula}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {synthesis.category && (
                    <Badge variant="outline" className="text-xs">
                      {synthesis.category.name}
                    </Badge>
                  )}
                  {synthesis.difficulty && (
                    <Badge
                      variant="outline"
                      className={`text-xs capitalize ${difficultyColors[synthesis.difficulty]}`}
                    >
                      {synthesis.difficulty}
                    </Badge>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  {synthesis.total_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {synthesis.total_time}
                    </span>
                  )}
                  {synthesis.yield_percentage && (
                    <span className="flex items-center gap-1">
                      <Percent className="h-3.5 w-3.5" />
                      {synthesis.yield_percentage}% yield
                    </span>
                  )}
                </div>

                {synthesis.safety_notes && (
                  <div className="mt-3 flex items-start gap-2 rounded-md bg-warning/10 p-2 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-warning-foreground" />
                    <span className="line-clamp-2 text-warning-foreground">
                      {synthesis.safety_notes}
                    </span>
                  </div>
                )}

                {synthesis.is_default && (
                  <Badge variant="secondary" className="mt-3 text-xs">
                    Built-in Protocol
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <SynthesisDetailModal
        synthesisId={selectedSynthesis?.id || null}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  )
}
