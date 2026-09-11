"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { AdminLoginDialog } from "@/components/admin-login-dialog"
import { useAdmin } from "@/components/admin-provider"
import { 
  Trophy, 
  Users, 
  Calendar, 
  CalendarDays,
  DollarSign, 
  PlayCircle,
  Menu,
  LogOut,
  Shield
} from "lucide-react"

const navItems = [
  { href: "/", label: "Dashboard", icon: Trophy },
  { href: "/players", label: "Players", icon: Users },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/current-event", label: "Current Event", icon: PlayCircle },
  { href: "/money", label: "Money", icon: DollarSign },
]

export function Navigation() {
  const pathname = usePathname()
  const { isAdmin, logout } = useAdmin()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)

  return (
    <>
      <header 
        className="sticky top-0 z-50 border-b border-border bg-background"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logos */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/" className="flex items-center">
                <Image
                  src="/images/fcdgl-logo.png"
                  alt="Fulton County Disc Golf League"
                  width={120}
                  height={60}
                  className="h-8 xs:h-10 sm:h-12 w-auto"
                  priority
                />
              </Link>
              <div className="h-5 sm:h-8 w-px bg-border" />
              <Image
                src="/images/srm-logo-white.png"
                alt="SRM - Sponsor"
                width={100}
                height={40}
                className="h-4 xs:h-5 sm:h-8 w-auto"
                loading="eager"
              />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* Right side - Mobile menu + Admin */}
            <div className="flex items-center gap-2" style={{ paddingRight: 'env(safe-area-inset-right)' }}>
              {/* Mobile Menu using Sheet */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="md:hidden h-11 w-11"
                    aria-label="Open menu"
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 pt-12">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <nav className="flex flex-col gap-2">
                    {navItems.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                            isActive 
                              ? "bg-primary text-primary-foreground" 
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          {item.label}
                        </Link>
                      )
                    })}
                    <div className="pt-4 mt-4 border-t border-border">
                      {isAdmin ? (
                        <div className="flex flex-col gap-2">
                          <Link
                            href="/admin"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-primary hover:bg-secondary"
                          >
                            <Shield className="h-5 w-5" />
                            Admin Panel
                          </Link>
                          <button
                            onClick={() => {
                              logout()
                              setMobileMenuOpen(false)
                            }}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary w-full text-left"
                          >
                            <LogOut className="h-5 w-5" />
                            Logout
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setLoginDialogOpen(true)
                            setMobileMenuOpen(false)
                          }}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary w-full text-left"
                        >
                          <Shield className="h-5 w-5" />
                          Admin Login
                        </button>
                      )}
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
              
              {/* Admin buttons - hidden on mobile */}
              {isAdmin ? (
                <div className="hidden sm:flex items-center gap-2">
                  <Link href="/admin">
                    <Button variant="outline" size="sm" className="flex items-center gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                      <Shield className="h-4 w-4" />
                      Admin
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={logout}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLoginDialogOpen(true)}
                  className="hidden sm:flex"
                >
                  Admin Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <AdminLoginDialog 
        open={loginDialogOpen} 
        onOpenChange={setLoginDialogOpen} 
      />
    </>
  )
}
