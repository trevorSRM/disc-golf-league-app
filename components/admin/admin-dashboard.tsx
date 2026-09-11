"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAdmin } from "@/components/admin-provider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlayersManager } from "@/components/admin/players-manager"
import { EventsManager } from "@/components/admin/events-manager"
import { CurrentEventManager } from "@/components/admin/current-event-manager"
import { MoneyManager } from "@/components/admin/money-manager"
import { Player, Week, WeekWithDetails, LeagueFinances, AceWithPlayer, DoublesTeamWithPlayers } from "@/lib/types"
import { CalculatedFinances, PlayerMoneyRanking } from "@/lib/data"
import { Users, Calendar, PlayCircle, DollarSign, Shield, AlertTriangle } from "lucide-react"

interface AdminDashboardProps {
  players: Player[]
  events: Week[]
  currentEvent: WeekWithDetails | null
  currentEventTeams: DoublesTeamWithPlayers[]
  finances: LeagueFinances | null
  calculatedFinances: CalculatedFinances
  aces: AceWithPlayer[]
  handicaps: Map<string, number>
  moneyRankings: PlayerMoneyRanking[]
}

export function AdminDashboard({ 
  players: initialPlayers, 
  events: initialEvents,
  currentEvent,
  currentEventTeams,
  finances: initialFinances,
  calculatedFinances,
  aces: initialAces,
  handicaps,
  moneyRankings
}: AdminDashboardProps) {
  const { isAdmin } = useAdmin()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState("current-event")

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-warning mx-auto" />
              <h2 className="text-xl font-bold">Access Denied</h2>
              <p className="text-muted-foreground">
                You need to be logged in as an admin to access this page.
              </p>
              <Button onClick={() => router.push("/")}>
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage the FCDGL league</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1">
          <TabsTrigger value="players" className="gap-1.5 px-2 py-2 text-xs sm:text-sm">
            <Users className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Players</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-1.5 px-2 py-2 text-xs sm:text-sm">
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Events</span>
          </TabsTrigger>
          <TabsTrigger value="current-event" className="gap-1.5 px-2 py-2 text-xs sm:text-sm relative">
            <PlayCircle className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Current</span>
            {currentEvent && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="money" className="gap-1.5 px-2 py-2 text-xs sm:text-sm">
            <DollarSign className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Money</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="players">
          <PlayersManager initialPlayers={initialPlayers} />
        </TabsContent>

        <TabsContent value="events">
          <EventsManager 
            initialEvents={initialEvents} 
            players={initialPlayers}
            hasCurrentEvent={!!currentEvent}
            onEventCreated={() => setActiveTab("current-event")}
          />
        </TabsContent>

        <TabsContent value="current-event">
          <CurrentEventManager 
            currentEvent={currentEvent}
            players={initialPlayers}
            doublesTeams={currentEventTeams}
            handicaps={handicaps}
          />
        </TabsContent>

        <TabsContent value="money">
          <MoneyManager 
            initialFinances={initialFinances}
            calculatedFinances={calculatedFinances}
            players={initialPlayers}
            aces={initialAces}
            moneyRankings={moneyRankings}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
