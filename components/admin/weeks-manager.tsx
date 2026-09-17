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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Player, Week, DoublesTeamWithPlayers, calculateTeamHandicap } from "@/lib/types"
import { Plus, Calendar, Users, Trash2, Shuffle, Users2 } from "lucide-react"
import { createWeek, deleteWeek, updateAttendance, updateCTPWinner, saveDoublesTeams, updateDoublesTeamScore } from "@/app/actions/weeks"
import { formatDate, todayDateString } from "@/lib/utils"

interface WeeksManagerProps {
  initialWeeks: Week[]
  players: Player[]
}

interface GeneratedTeam {
  player1: Player
  player2: Player
  handicap1: number
  handicap2: number
  teamHandicap: number
}

export function WeeksManager({ initialWeeks, players }: WeeksManagerProps) {
  const router = useRouter()
  const [weeks, setWeeks] = useState(initialWeeks)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [manageDialogOpen, setManageDialogOpen] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null)
  const [attendance, setAttendance] = useState<Record<string, { present: boolean; score: string }>>({})
  const [ctpWinner, setCtpWinner] = useState<string>("")
  const [handicaps, setHandicaps] = useState<Record<string, number>>({})
  
  // Doubles state
  const [generatedTeams, setGeneratedTeams] = useState<GeneratedTeam[]>([])
  const [savedTeams, setSavedTeams] = useState<DoublesTeamWithPlayers[]>([])
  const [teamScores, setTeamScores] = useState<Record<string, string>>({})
  const [isRandomizing, setIsRandomizing] = useState(false)
  
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => todayDateString()
  
  // Calculate next week number
  const getNextWeekNumber = () => {
    if (weeks.length === 0) return "1"
    const maxWeek = Math.max(...weeks.map(w => w.week_number))
    return String(maxWeek + 1)
  }
  
  // New week form
  const [newWeekNumber, setNewWeekNumber] = useState(getNextWeekNumber())
  const [newWeekDate, setNewWeekDate] = useState(getTodayDate())
  const [newWeekCourse, setNewWeekCourse] = useState("")
  const [newWeekIsDoubles, setNewWeekIsDoubles] = useState(false)
  const [loading, setLoading] = useState(false)

  // Fetch handicaps on mount
  useEffect(() => {
    fetch("/api/handicaps")
      .then(res => res.json())
      .then(data => setHandicaps(data.handicaps || {}))
  }, [])

  const handleCreateWeek = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWeekNumber || !newWeekDate) return
    
    setLoading(true)
    try {
      const result = await createWeek(
        parseInt(newWeekNumber),
        newWeekDate,
        newWeekCourse || null,
        newWeekIsDoubles
      )
      if (result.success && result.week) {
        const updatedWeeks = [result.week!, ...weeks]
        setWeeks(updatedWeeks)
        const maxWeek = Math.max(...updatedWeeks.map(w => w.week_number))
        setNewWeekNumber(String(maxWeek + 1))
        setNewWeekDate(getTodayDate())
        setNewWeekCourse("")
        setNewWeekIsDoubles(false)
        setCreateDialogOpen(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteWeek = async (week: Week) => {
    if (!confirm(`Delete Week ${week.week_number}? This will remove all attendance records and teams.`)) {
      return
    }
    
    setLoading(true)
    try {
      const result = await deleteWeek(week.id)
      if (result.success) {
        setWeeks(prev => prev.filter(w => w.id !== week.id))
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const openManageDialog = async (week: Week) => {
    setSelectedWeek(week)
    setCtpWinner(week.ctp_winner_id || "none")
    setGeneratedTeams([])
    setSavedTeams([])
    setTeamScores({})
    
    // Fetch current attendance for this week
    const response = await fetch(`/api/attendance/${week.id}`)
    const data = await response.json()
    
    const attendanceMap: Record<string, { present: boolean; score: string }> = {}
    players.forEach(p => {
      const record = data.attendance?.find((a: { player_id: string; score: number | null }) => a.player_id === p.id)
      attendanceMap[p.id] = {
        present: !!record,
        score: record?.score?.toString() || ""
      }
    })
    setAttendance(attendanceMap)
    
    // If doubles week, fetch existing teams
    if (week.is_doubles) {
      const teamsResponse = await fetch(`/api/doubles-teams/${week.id}`)
      const teamsData = await teamsResponse.json()
      if (teamsData.teams && teamsData.teams.length > 0) {
        setSavedTeams(teamsData.teams)
        const scores: Record<string, string> = {}
        teamsData.teams.forEach((t: DoublesTeamWithPlayers) => {
          scores[t.id] = t.score?.toString() || ""
        })
        setTeamScores(scores)
      }
    }
    
    setManageDialogOpen(true)
  }

  const handleSaveAttendance = async () => {
    if (!selectedWeek) return
    
    setLoading(true)
    try {
      const attendanceData = Object.entries(attendance)
        .filter(([_, value]) => value.present)
        .map(([playerId, value]) => ({
          player_id: playerId,
          score: value.score ? parseInt(value.score) : null
        }))
      
      await updateAttendance(selectedWeek.id, attendanceData)
      
      if (ctpWinner !== "none") {
        await updateCTPWinner(selectedWeek.id, ctpWinner)
      } else {
        await updateCTPWinner(selectedWeek.id, null)
      }
      
      // Save doubles teams if any generated
      if (selectedWeek.is_doubles && generatedTeams.length > 0) {
        const teamsToSave = generatedTeams.map(t => ({
          player1_id: t.player1.id,
          player2_id: t.player2.id,
          team_handicap: t.teamHandicap
        }))
        await saveDoublesTeams(selectedWeek.id, teamsToSave)
      }
      
      // Update team scores if any
      if (selectedWeek.is_doubles && savedTeams.length > 0) {
        for (const team of savedTeams) {
          const score = teamScores[team.id]
          if (score !== undefined) {
            await updateDoublesTeamScore(team.id, score ? parseInt(score) : null)
          }
        }
      }
      
      setManageDialogOpen(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const toggleAttendance = (playerId: string) => {
    setAttendance(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        present: !prev[playerId]?.present
      }
    }))
  }

  const updateScore = (playerId: string, score: string) => {
    setAttendance(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        score
      }
    }))
  }

  const randomizeTeams = () => {
    const presentPlayerIds = Object.entries(attendance)
      .filter(([_, v]) => v.present)
      .map(([id]) => id)
    
    const presentPlayers = players.filter(p => presentPlayerIds.includes(p.id))
    
    if (presentPlayers.length < 2) {
      alert("Need at least 2 players to form teams")
      return
    }
    
    setIsRandomizing(true)
    
    // Shuffle animation
    let shuffleCount = 0
    const shuffleInterval = setInterval(() => {
      const shuffled = [...presentPlayers].sort(() => Math.random() - 0.5)
      const teams: GeneratedTeam[] = []
      
      for (let i = 0; i < shuffled.length - 1; i += 2) {
        const p1 = shuffled[i]
        const p2 = shuffled[i + 1]
        const h1 = handicaps[p1.id] || 0
        const h2 = handicaps[p2.id] || 0
        teams.push({
          player1: p1,
          player2: p2,
          handicap1: h1,
          handicap2: h2,
          teamHandicap: calculateTeamHandicap(h1, h2)
        })
      }
      
      // Handle odd player
      if (shuffled.length % 2 !== 0) {
        const oddPlayer = shuffled[shuffled.length - 1]
        const h = handicaps[oddPlayer.id] || 0
        teams.push({
          player1: oddPlayer,
          player2: oddPlayer,
          handicap1: h,
          handicap2: h,
          teamHandicap: calculateTeamHandicap(h, h)
        })
      }
      
      setGeneratedTeams(teams)
      shuffleCount++
      
      if (shuffleCount >= 10) {
        clearInterval(shuffleInterval)
        setIsRandomizing(false)
      }
    }, 100)
  }

  const presentPlayers = Object.entries(attendance).filter(([_, v]) => v.present)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Weekly Rounds ({weeks.length})
        </CardTitle>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Week
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Week</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateWeek} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="week-number">Week Number</Label>
                  <Input
                    id="week-number"
                    type="number"
                    value={newWeekNumber}
                    onChange={(e) => setNewWeekNumber(e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="week-date">Date</Label>
                  <Input
                    id="week-date"
                    type="date"
                    value={newWeekDate}
                    onChange={(e) => setNewWeekDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="course">Course Name (optional)</Label>
                <Input
                  id="course"
                  value={newWeekCourse}
                  onChange={(e) => setNewWeekCourse(e.target.value)}
                  placeholder="Enter course name"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is-doubles"
                  checked={newWeekIsDoubles}
                  onCheckedChange={(checked) => setNewWeekIsDoubles(!!checked)}
                />
                <Label htmlFor="is-doubles" className="cursor-pointer">
                  This is a Doubles week (random draw)
                </Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !newWeekNumber || !newWeekDate}>
                  {loading ? "Creating..." : "Create Week"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {weeks.map(week => (
            <div
              key={week.id}
              className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">Week {week.week_number}</span>
                  <Badge variant="outline">
                    {formatDate(week.date, "MMM d, yyyy")}
                  </Badge>
                  {week.is_doubles && (
                    <Badge variant="default" className="bg-primary">
                      <Users2 className="h-3 w-3 mr-1" />
                      Doubles
                    </Badge>
                  )}
                </div>
                {week.course_name && (
                  <p className="text-sm text-muted-foreground">{week.course_name}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openManageDialog(week)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteWeek(week)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {weeks.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              No weeks created yet. Create your first week to start tracking!
            </p>
          )}
        </div>

        {/* Manage Week Dialog */}
        <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Manage Week {selectedWeek?.week_number}
                {selectedWeek?.course_name && ` - ${selectedWeek.course_name}`}
                {selectedWeek?.is_doubles && (
                  <Badge variant="default" className="bg-primary">Doubles</Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Attendance Section */}
              <div>
                <h3 className="text-sm font-medium mb-3">
                  {selectedWeek?.is_doubles ? "Select Players for Doubles" : "Attendance & Scores"} ({presentPlayers.length} players)
                </h3>
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {players.map(player => (
                    <div
                      key={player.id}
                      className={`flex items-center gap-4 p-3 rounded-lg border ${
                        attendance[player.id]?.present 
                          ? "bg-primary/5 border-primary/30" 
                          : "bg-secondary/30 border-border"
                      }`}
                    >
                      <Checkbox
                        checked={attendance[player.id]?.present || false}
                        onCheckedChange={() => toggleAttendance(player.id)}
                      />
                      <div className="flex-1">
                        <span className="font-medium">{player.name}</span>
                        {player.is_member && (
                          <Badge variant="default" className="ml-2 text-xs">Member</Badge>
                        )}
                        <span className="ml-2 text-sm text-muted-foreground">
                          (HC: {handicaps[player.id]?.toFixed(1) || "0.0"})
                        </span>
                      </div>
                      {!selectedWeek?.is_doubles && attendance[player.id]?.present && (
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`score-${player.id}`} className="text-sm">Score:</Label>
                          <Input
                            id={`score-${player.id}`}
                            type="number"
                            className="w-20"
                            value={attendance[player.id]?.score || ""}
                            onChange={(e) => updateScore(player.id, e.target.value)}
                            placeholder="--"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Doubles Randomizer */}
              {selectedWeek?.is_doubles && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Teams</h3>
                    <Button
                      onClick={randomizeTeams}
                      disabled={isRandomizing || presentPlayers.length < 2}
                      variant="outline"
                    >
                      <Shuffle className={`h-4 w-4 mr-2 ${isRandomizing ? "animate-spin" : ""}`} />
                      {isRandomizing ? "Shuffling..." : "Randomize Teams"}
                    </Button>
                  </div>
                  
                  {/* Generated Teams (new) */}
                  {generatedTeams.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Newly generated teams (will be saved):</p>
                      {generatedTeams.map((team, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-primary/10 border border-primary/30"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{team.player1.name}</span>
                              <span className="text-muted-foreground text-sm"> ({team.handicap1.toFixed(1)})</span>
                              {team.player1.id !== team.player2.id && (
                                <>
                                  <span className="mx-2">&</span>
                                  <span className="font-medium">{team.player2.name}</span>
                                  <span className="text-muted-foreground text-sm"> ({team.handicap2.toFixed(1)})</span>
                                </>
                              )}
                            </div>
                            <Badge variant="outline" className="bg-primary/20">
                              Team HC: {team.teamHandicap.toFixed(1)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Saved Teams (existing) */}
                  {savedTeams.length > 0 && generatedTeams.length === 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Saved teams (enter scores):</p>
                      {savedTeams.map((team) => (
                        <div
                          key={team.id}
                          className="p-3 rounded-lg bg-secondary/30 border border-border"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{team.player1?.name}</span>
                              {team.player1_id !== team.player2_id && (
                                <>
                                  <span className="mx-2">&</span>
                                  <span className="font-medium">{team.player2?.name}</span>
                                </>
                              )}
                              <Badge variant="outline" className="ml-2">
                                HC: {team.team_handicap?.toFixed(1)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-sm">Score:</Label>
                              <Input
                                type="number"
                                className="w-20"
                                value={teamScores[team.id] || ""}
                                onChange={(e) => setTeamScores(prev => ({ ...prev, [team.id]: e.target.value }))}
                                placeholder="--"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {savedTeams.length === 0 && generatedTeams.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Select players and click Randomize to generate teams
                    </p>
                  )}
                </div>
              )}

              {/* CTP Winner - only for non-doubles */}
              {!selectedWeek?.is_doubles && (
                <div className="space-y-2">
                  <Label>CTP Winner</Label>
                  <Select value={ctpWinner} onValueChange={setCtpWinner}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select CTP winner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No CTP winner</SelectItem>
                      {presentPlayers.map(([playerId]) => {
                        const player = players.find(p => p.id === playerId)
                        return player ? (
                          <SelectItem key={playerId} value={playerId}>
                            {player.name}
                          </SelectItem>
                        ) : null
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setManageDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveAttendance} disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
