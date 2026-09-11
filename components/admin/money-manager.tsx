"use client"

// Money manager with ace tracking
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Player, LeagueFinances, AceWithPlayer } from "@/lib/types"
import { CalculatedFinances, PlayerMoneyRanking } from "@/lib/data"
import { DollarSign, Plus, Disc, TrendingUp, TrendingDown, Users, Calendar, Trash2, Trophy, Flame, Target } from "lucide-react"
import { updateFinances, recordAce, deleteAce } from "@/app/actions/money"
import { format } from "date-fns"

interface MoneyManagerProps {
  initialFinances: LeagueFinances | null
  calculatedFinances: CalculatedFinances
  players: Player[]
  aces: AceWithPlayer[]
  moneyRankings: PlayerMoneyRanking[]
}

export function MoneyManager({ initialFinances, calculatedFinances, players, aces = [], moneyRankings = [] }: MoneyManagerProps) {
  const router = useRouter()
  const [acePool, setAcePool] = useState(initialFinances?.ace_pool || 0)
  const [aceDialogOpen, setAceDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => new Date().toISOString().split('T')[0]
  
  // Ace form
  const [acePlayerId, setAcePlayerId] = useState("")
  const [aceDate, setAceDate] = useState(getTodayDate())
  const [aceHole, setAceHole] = useState("")
  const [aceCourse, setAceCourse] = useState("")

  const handleRecordAce = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acePlayerId || !aceDate) return
    
    setLoading(true)
    try {
      const result = await recordAce(
        acePlayerId,
        aceDate,
        acePool,
        aceHole ? parseInt(aceHole) : null,
        aceCourse || null
      )
      if (result.success) {
        setAcePool(0)
        setAcePlayerId("")
        setAceDate(getTodayDate())
        setAceHole("")
        setAceCourse("")
        setAceDialogOpen(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAce = async (aceId: string) => {
    if (!confirm("Are you sure you want to delete this ace? This cannot be undone.")) return
    
    setLoading(true)
    try {
      const result = await deleteAce(aceId)
      if (result.success) {
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const addWeeklyAcePool = async () => {
    setLoading(true)
    try {
      const result = await updateFinances({
        ace_pool: acePool + 40
      })
      if (result.success && result.finances) {
        setAcePool(result.finances.ace_pool)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const netBalance = calculatedFinances.total_collected - calculatedFinances.total_paid_out

  return (
    <div className="space-y-6">
      {/* Auto-Calculated Finances Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            League Finances (Auto-Calculated)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-success/10 border border-success/30 text-center">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-success" />
              <div className="text-2xl font-bold text-success">
                ${calculatedFinances.total_collected}
              </div>
              <div className="text-sm text-muted-foreground">Collected</div>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 text-center">
              <TrendingDown className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold text-primary">
                ${calculatedFinances.total_paid_out}
              </div>
              <div className="text-sm text-muted-foreground">Paid Out</div>
            </div>
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/30 text-center">
              <Disc className="h-6 w-6 mx-auto mb-2 text-accent" />
              <div className="text-2xl font-bold text-accent">
                ${acePool}
              </div>
              <div className="text-sm text-muted-foreground">Ace Pool</div>
            </div>
            <div className={`p-4 rounded-lg text-center ${netBalance >= 0 ? 'bg-money/10 border-money/30' : 'bg-destructive/10 border-destructive/30'} border`}>
              <DollarSign className={`h-6 w-6 mx-auto mb-2 ${netBalance >= 0 ? 'text-money' : 'text-destructive'}`} />
              <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-money' : 'text-destructive'}`}>
                ${netBalance}
              </div>
              <div className="text-sm text-muted-foreground">Net Balance</div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                Money In Breakdown
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    <Users className="h-4 w-4 inline mr-1" />
                    {calculatedFinances.breakdown.member_count} members × $25
                  </span>
                  <span className="font-medium">${calculatedFinances.breakdown.membership_fees}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    {calculatedFinances.breakdown.total_attendance} rounds × $5
                  </span>
                  <span className="font-medium">${calculatedFinances.breakdown.weekly_fees}</span>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-primary" />
                Money Out Breakdown
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {calculatedFinances.breakdown.weeks_with_scores} Hot Rounds × $20
                  </span>
                  <span className="font-medium">${calculatedFinances.breakdown.hot_round_payouts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {calculatedFinances.breakdown.weeks_with_ctp} CTPs × $20
                  </span>
                  <span className="font-medium">${calculatedFinances.breakdown.ctp_payouts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ace Payouts</span>
                  <span className="font-medium">${calculatedFinances.breakdown.ace_payouts}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ace Pool Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Disc className="h-5 w-5 text-accent" />
            Ace Pool Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="text-4xl font-bold text-accent">${acePool}</div>
            <Button 
              variant="outline" 
              onClick={addWeeklyAcePool}
              disabled={loading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add $40 (Weekly)
            </Button>
          </div>
          
          <Dialog open={aceDialogOpen} onOpenChange={setAceDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="default">
                <Disc className="h-4 w-4 mr-2" />
                Someone Hit an Ace!
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Ace</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleRecordAce} className="space-y-4">
                <div className="space-y-2">
                  <Label>Player</Label>
                  <Select value={acePlayerId} onValueChange={setAcePlayerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select player" />
                    </SelectTrigger>
                    <SelectContent>
                      {players.map(player => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ace-course">Course</Label>
                  <Input
                    id="ace-course"
                    value={aceCourse}
                    onChange={(e) => setAceCourse(e.target.value)}
                    placeholder="Course name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ace-date">Date</Label>
                    <Input
                      id="ace-date"
                      type="date"
                      value={aceDate}
                      onChange={(e) => setAceDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ace-hole">Hole # (optional)</Label>
                    <Input
                      id="ace-hole"
                      type="number"
                      value={aceHole}
                      onChange={(e) => setAceHole(e.target.value)}
                      placeholder="Hole"
                    />
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
                  <div className="text-sm text-muted-foreground">Payout Amount:</div>
                  <div className="text-2xl font-bold text-accent">
                    ${acePool}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setAceDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || !acePlayerId || !aceDate}>
                    {loading ? "Recording..." : "Record Ace"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Recorded Aces */}
      {Array.isArray(aces) && aces.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Disc className="h-5 w-5 text-money" />
              Recorded Aces ({aces.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aces.map((ace) => (
                <div
                  key={ace.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-money/10 border border-money/30"
                >
                  <div>
                    <div className="font-medium">{ace.player?.name || "Unknown Player"}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(ace.date), "MMM d, yyyy")}
                      {ace.course_name && ` • ${ace.course_name}`}
                      {ace.hole_number && ` • Hole ${ace.hole_number}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-money">${ace.payout}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteAce(ace.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Money Rankings */}
      {moneyRankings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-money" />
              Money Rankings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {moneyRankings.map((ranking, index) => (
                <div
                  key={ranking.player_id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    index === 0 ? 'bg-money/10 border-money/30' : 'bg-muted/30 border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-bold text-lg w-6 ${index === 0 ? 'text-money' : 'text-muted-foreground'}`}>
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-medium">{ranking.player_name}</div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {ranking.hot_round_wins > 0 && (
                          <span className="flex items-center gap-1">
                            <Flame className="h-3 w-3 text-primary" />
                            {ranking.hot_round_wins} HR
                          </span>
                        )}
                        {ranking.ctp_wins > 0 && (
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3 text-success" />
                            {ranking.ctp_wins} CTP
                          </span>
                        )}
                        {ranking.ace_payouts > 0 && (
                          <span className="flex items-center gap-1">
                            <Disc className="h-3 w-3 text-accent" />
                            ${ranking.ace_payouts} Ace
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={`text-xl font-bold ${index === 0 ? 'text-money' : ''}`}>
                    ${ranking.total_winnings}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardContent className="py-4">
          <div className="text-sm text-muted-foreground">
            <strong>How it works:</strong> Money collected and paid out is automatically calculated based on:
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Members × $25 membership fee</li>
              <li>Attendance records × $5 weekly fee</li>
              <li>Weeks with scores = $20 hot round payout</li>
              <li>Weeks with CTP winner = $20 CTP payout</li>
              <li>Recorded aces = ace pool payouts</li>
            </ul>
            <p className="mt-2">The only thing you need to manually manage is the Ace Pool (+$40/week) and recording aces.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
