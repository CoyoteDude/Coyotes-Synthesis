'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FlaskConical,
  Package,
  Plus,
  Menu,
  X,
  AlertTriangle,
  Beaker,
  FileText,
} from 'lucide-react'

interface AppShellProps {
  children: React.ReactNode
  lowStockCount?: number
}

const navigation = [
  { name: 'Synthesis Database', href: '/', icon: FlaskConical },
  { name: 'Add Synthesis', href: '/add', icon: Plus },
  { name: 'Inventory', href: '/inventory', icon: Package },
]

export function AppShell({ children, lowStockCount = 0 }: AppShellProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Beaker className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-foreground">ChemSynth Pro</h1>
              <p className="text-xs text-muted-foreground">Synthesis Database</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:items-center md:gap-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                      'gap-2',
                      isActive && 'bg-secondary text-secondary-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                    {item.name === 'Inventory' && lowStockCount > 0 && (
                      <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                        {lowStockCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              )
            })}
          </nav>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="border-t border-border md:hidden">
            <nav className="flex flex-col gap-1 p-4">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      className="w-full justify-start gap-2"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                      {item.name === 'Inventory' && lowStockCount > 0 && (
                        <Badge variant="destructive" className="ml-auto">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          {lowStockCount} low
                        </Badge>
                      )}
                    </Button>
                  </Link>
                )
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-auto">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
            <p className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              ChemSynth Pro - Chemical Synthesis Database
            </p>
            <p>For research and educational purposes</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
