"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Player, DoublesEvent, calculateTeamHandicap } from "@/lib/types"
import { Plus, Target, Shuffle, Users, Trash2, Sparkles } from "lucide-react"
import { createDoublesEvent, deleteDoublesEvent, saveDoublesTeams, updateDoublesScores } from "@/app/actions/doubles"
import { format } from "date-fns"

interface DoublesManagerProps {
  initialEvents: DoublesEvent[]
  players: Player[]
}

interface RandomTeam {
  player1: Player
  player2: Player
  handicap: number
}

export function DoublesManager({ initialEvents, players }: DoublesManagerProps) {
  const router = useRouter()
  const [events, setEvents] = useState(initialEvents)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [randomizeDialogOpen, setRandomizeDialogOpen] = useState(false)
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [randomizedTeams, setRandomizedTeams] = useState<RandomTeam[]>([])
  const [playerHandicaps, setPlayerHandicaps] = useState<Record<string, number>>({})
  const [isRandomizing, setIsRandomizing] = useState(false)
  
  // New event form
  const [newEventDate, setNewEventDate] = useState("")
  const [newEventCourse, setNewEventCourse] = useState("")
  const [loading, setLoading] = useState(false)

  // Fetch player handicaps
  useEffect(() => {
    fetch("/api/handicaps")
      .then(res => res.json())
      .then(data => setPlayerHandicaps(data.handicaps || {}))
      .catch(console.error)
  }, [])

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEventDate) return
    
    setLoading(true)
    try {
      const result = await createDoublesEvent(newEventDate, newEventCourse || null)
      if (result.success && result.event) {
        setEvents(prev => [result.event!, ...prev])
        setNewEventDate("")
        setNewEventCourse("")
        setCreateDialogOpen(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEvent = async (event: DoublesEvent) => {
    if (!confirm("Delete this doubles event? This will remove all team records.")) {
      return
    }
    
    setLoading(true)
    try {
      const result = await deleteDoublesEvent(event.id)
      if (result.success) {
        setEvents(prev => prev.filter(e => e.id !== event.id))
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    )
    setRandomizedTeams([])
  }

  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array]
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]]
    }
    return newArray
  }

  const randomizeTeams = async () => {
    if (selectedPlayers.length < 2) return
    
    setIsRandomizing(true)
    
    // Animation effect - shuffle multiple times
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 150))
      const shuffled = shuffleArray(selectedPlayers)
      const tempTeams: RandomTeam[] = []
      for (let j = 0; j < shuffled.length; j += 2) {
        if (shuffled[j + 1]) {
          const p1 = players.find(p => p.id === shuffled[j])!
          const p2 = players.find(p => p.id === shuffled[j + 1])!
          const h1 = playerHandicaps[p1.id] || 0
          const h2 = playerHandicaps[p2.id] || 0
          tempTeams.push({
            player1: p1,
            player2: p2,
            handicap: calculateTeamHandicap(h1, h2)
          })
        }
      }
      setRandomizedTeams(tempTeams)
    }
    
    // Final shuffle
    const shuffled = shuffleArray(selectedPlayers)
    const teams: RandomTeam[] = []
    for (let i = 0; i < shuffled.length; i += 2) {
      if (shuffled[i + 1]) {
        const p1 = players.find(p => p.id === shuffled[i])!
        const p2 = players.find(p => p.id === shuffled[i + 1])!
        const h1 = playerHandicaps[p1.id] || 0
        const h2 = playerHandicaps[p2.id] || 0
        teams.push({
          player1: p1,
          player2: p2,
          handicap: calculateTeamHandicap(h1, h2)
        })
      }
    }
    
    // Handle odd player
    if (shuffled.length % 2 !== 0) {
      const oddPlayer = players.find(p => p.id === shuffled[shuffled.length - 1])!
      // Add to a random team or create a notification
      alert(`Odd player: ${oddPlayer.name} - they'll need to join a team or play solo!`)
    }
    
    setRandomizedTeams(teams)
    setIsRandomizing(false)
  }

  const saveTeamsToEvent = async (eventId: string) => {
    setLoading(true)
    try {
      const teamsData = randomizedTeams.map(team => ({
        player1_id: team.player1.id,
        player2_id: team.player2.id,
        team_handicap: team.handicap
      }))
      
      await saveDoublesTeams(eventId, teamsData)
      setRandomizeDialogOpen(false)
      setRandomizedTeams([])
      setSelectedPlayers([])
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Doubles Events ({events.length})
        </CardTitle>
        <div className="flex gap-2">
          <Dialog open={randomizeDialogOpen} onOpenChange={setRandomizeDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Shuffle className="h-4 w-4 mr-2" />
                Randomize Teams
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Random Doubles Draw
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Player Selection */}
                <div>
                  <h3 className="text-sm font-medium mb-3">
                    Select Players ({selectedPlayers.length} selected)
                  </h3>
                  <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                    {players.map(player => (
                      <div
                        key={player.id}
                        className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                          selectedPlayers.includes(player.id)
                            ? "bg-primary/10 border-primary"
                            : "bg-secondary/30 border-border hover:border-primary/50"
                        }`}
                        onClick={() => togglePlayerSelection(player.id)}
                      >
                        <Checkbox
                          checked={selectedPlayers.includes(player.id)}
                          onCheckedChange={() => togglePlayerSelection(player.id)}
                        />
                        <span className="text-sm">{player.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          HC: {(playerHandicaps[player.id] || 0).toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Randomize Button */}
                <Button 
                  onClick={randomizeTeams} 
                  disabled={selectedPlayers.length < 2 || isRandomizing}
                  className="w-full"
                  size="lg"
                >
                  {isRandomizing ? (
                    <>
                      <Shuffle className="h-5 w-5 mr-2 animate-spin" />
                      Shuffling...
                    </>
                  ) : (
                    <>
                      <Shuffle className="h-5 w-5 mr-2" />
                      Randomize Teams ({Math.floor(selectedPlayers.length / 2)} teams)
                    </>
                  )}
                </Button>

                {/* Randomized Teams Display */}
                {randomizedTeams.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Teams</h3>
                    {randomizedTeams.map((team, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border animate-slide-up ${
                          isRandomizing ? "opacity-50" : ""
                        }`}
                        style={{ 
                          animationDelay: `${index * 100}ms`,
                          background: `linear-gradient(135deg, var(--primary) 0%, transparent 100%)`,
                          backgroundSize: "200% 200%"
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-background">Team {index + 1}</Badge>
                            <span className="font-medium">{team.player1.name}</span>
                            <span className="text-muted-foreground">&</span>
                            <span className="font-medium">{team.player2.name}</span>
                          </div>
                          <Badge variant="secondary">
                            HC: {team.handicap.toFixed(1)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    
                    {/* Save to Event */}
                    <div className="pt-4 border-t">
                      <Label className="text-sm">Save teams to event:</Label>
                      <div className="flex gap-2 mt-2">
                        {events.slice(0, 3).map(event => (
                          <Button
                            key={event.id}
                            variant="outline"
                            size="sm"
                            onClick={() => saveTeamsToEvent(event.id)}
                            disabled={loading}
                          >
                            {format(new Date(event.event_date), "MMM d")}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Doubles Event</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="event-date">Event Date</Label>
                  <Input
                    id="event-date"
                    type="date"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-course">Course Name (optional)</Label>
                  <Input
                    id="event-course"
                    value={newEventCourse}
                    onChange={(e) => setNewEventCourse(e.target.value)}
                    placeholder="Enter course name"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || !newEventDate}>
                    {loading ? "Creating..." : "Create Event"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {events.map(event => (
            <div
              key={event.id}
              className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {format(new Date(event.event_date), "MMM d, yyyy")}
                  </Badge>
                </div>
                {event.course_name && (
                  <p className="text-sm text-muted-foreground">{event.course_name}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/doubles/${event.id}`)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteEvent(event)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              No doubles events yet. Create one to start tracking!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
