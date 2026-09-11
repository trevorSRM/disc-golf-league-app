"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Player, WeekWithDetails, DoublesTeamWithPlayers, CardAssignment, calculateTeamHandicap, calculateWildManHandicap } from "@/lib/types"
import { 
  Calendar, Users2, MapPin, Shuffle, Save, Send, Target, 
  Trophy, AlertCircle, CheckCircle2, Edit2, X, Plus, UserPlus, Pencil
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  updateAttendance, updateCTPWinner, saveDoublesTeams, 
  saveCards, submitEvent, updateDoublesTeamScore, updateDoublesCTPAndScoringType 
} from "@/app/actions/weeks"
import { addPlayer } from "@/app/actions/players"
import { format } from "date-fns"

interface CurrentEventManagerProps {
  currentEvent: WeekWithDetails | null
  players: Player[]
  doublesTeams: DoublesTeamWithPlayers[]
  handicaps: Map<string, number>
}

export function CurrentEventManager({ 
  currentEvent, 
  players, 
  doublesTeams: initialDoublesTeams,
  handicaps 
}: CurrentEventManagerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [doublesTeams, setDoublesTeams] = useState<DoublesTeamWithPlayers[]>(initialDoublesTeams)
  const [cardAssignments, setCardAssignments] = useState<CardAssignment[]>(
    currentEvent?.card_assignments || []
  )
  const [wildMan, setWildMan] = useState<string | null>(null)
  
  // Score state
  const [scores, setScores] = useState<Record<string, string>>({})
  const [teamScores, setTeamScores] = useState<Record<string, string>>({})
  const [ctpWinner, setCtpWinner] = useState<string>(currentEvent?.ctp_winner_id || "")
  const [doublesCTPTeam, setDoublesCTPTeam] = useState<string>(currentEvent?.doubles_ctp_team_id || "")
  const [doublesScoringType, setDoublesScoringType] = useState<'raw' | 'handicap'>(
    currentEvent?.doubles_scoring_type || 'handicap'
  )
  const [playoffWinner, setPlayoffWinner] = useState<string>(currentEvent?.playoff_winner_id || "")
  const [playoffWinnerTeam, setPlayoffWinnerTeam] = useState<string>(currentEvent?.playoff_winner_team_id || "")
  
  // Editing state
  const [editAttendanceOpen, setEditAttendanceOpen] = useState(false)
  const [editingCards, setEditingCards] = useState(false)
  const [editingTeams, setEditingTeams] = useState(false)
  const [selectedPlayerForTeam, setSelectedPlayerForTeam] = useState<string | null>(null)
  const [selectedAttendance, setSelectedAttendance] = useState<Set<string>>(new Set())
  const [sanctionedPlayers, setSanctionedPlayers] = useState<Set<string>>(new Set())
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  
  // Local player list (so newly added players show up in check-in immediately)
  const [playerList, setPlayerList] = useState<Player[]>(players)
  const [quickAddName, setQuickAddName] = useState("")
  const [quickAddIsMember, setQuickAddIsMember] = useState(false)
  const [addingPlayer, setAddingPlayer] = useState(false)
  
  useEffect(() => {
    setPlayerList(players)
  }, [players])
  
  // Get attending player IDs
  const attendingPlayerIds = useMemo(() => {
    return currentEvent?.attendance?.map(a => a.player_id) || []
  }, [currentEvent?.attendance])
  
  // Calculate effective handicaps with non-member rule applied
  // Non-members (or players with < 3 rounds) get the best member's handicap
  const effectiveHandicaps = useMemo(() => {
    const effective = new Map<string, number>()
    
    // Find best member handicap among attending players
    // Higher handicap = better player (positive handicap is penalty)
    let bestMemberHandicap = 0
    for (const playerId of attendingPlayerIds) {
      const player = players.find(p => p.id === playerId)
      const rawHandicap = handicaps.get(playerId) || 0
      // A player has a valid handicap if it's not 0 (0 means < 3 rounds)
      // We check is_member and if they have a real handicap
      if (player?.is_member && rawHandicap !== 0 && rawHandicap > bestMemberHandicap) {
        bestMemberHandicap = rawHandicap
      }
    }
    
    // Also check members with 0 handicap who have 3+ rounds (handicap could legitimately be 0)
    // For simplicity, if best is still 0, check if any member is attending
    if (bestMemberHandicap === 0) {
      for (const playerId of attendingPlayerIds) {
        const player = players.find(p => p.id === playerId)
        const rawHandicap = handicaps.get(playerId) || 0
        if (player?.is_member && rawHandicap > bestMemberHandicap) {
          bestMemberHandicap = rawHandicap
        }
      }
    }
    
    // Apply the rule: members with handicap get their own, non-members get best member's
    for (const playerId of attendingPlayerIds) {
      const player = players.find(p => p.id === playerId)
      const rawHandicap = handicaps.get(playerId) || 0
      
      if (player?.is_member && rawHandicap !== 0) {
        // Member with valid handicap uses their own
        effective.set(playerId, rawHandicap)
      } else {
        // Non-member OR member without enough rounds gets best member handicap
        effective.set(playerId, bestMemberHandicap)
      }
    }
    
    return effective
  }, [attendingPlayerIds, players, handicaps])
  
  // Detect ties for playoff selection
  // For singles: players with the same final score
  // For doubles: teams with the same score (raw or handicap-adjusted based on scoring type)
  const tiedPlayers = useMemo(() => {
    if (currentEvent?.is_doubles) return []
    
    // Calculate final scores for all players with scores
    const playerScores: { id: string; name: string; finalScore: number }[] = []
    for (const [playerId, scoreStr] of Object.entries(scores)) {
      if (!scoreStr) continue
      const rawScore = parseInt(scoreStr)
      const hc = effectiveHandicaps.get(playerId) || 0
      const finalScore = (rawScore - 54) + hc // PAR = 54
      const player = players.find(p => p.id === playerId)
      if (player) {
        playerScores.push({ id: playerId, name: player.name, finalScore })
      }
    }
    
    if (playerScores.length === 0) return []
    
    // Find the lowest final score
    const minScore = Math.min(...playerScores.map(p => p.finalScore))
    // Get all players with that score
    const tied = playerScores.filter(p => p.finalScore === minScore)
    
    // Only return if there's a tie (more than 1 player)
    return tied.length > 1 ? tied : []
  }, [currentEvent?.is_doubles, scores, effectiveHandicaps, players])
  
  const tiedTeams = useMemo(() => {
    if (!currentEvent?.is_doubles) return []
    
    // Calculate scores for all teams with scores
    const teamScoresCalc: { id: string; name: string; score: number }[] = []
    for (const team of doublesTeams) {
      const scoreStr = teamScores[team.id]
      if (!scoreStr) continue
      const rawScore = parseInt(scoreStr)
      
      let effectiveScore: number
      if (doublesScoringType === 'raw') {
        effectiveScore = rawScore
      } else {
        // Handicap scoring: final score = raw - PAR + team handicap
        const p1Hc = effectiveHandicaps.get(team.player1_id) || 0
        const p2Hc = effectiveHandicaps.get(team.player2_id) || 0
        const teamHc = calculateTeamHandicap(p1Hc, p2Hc)
        effectiveScore = (rawScore - 54) + teamHc
      }
      
      teamScoresCalc.push({
        id: team.id,
        name: `${team.player1.name} & ${team.player2.name}`,
        score: effectiveScore
      })
    }
    
    if (teamScoresCalc.length === 0) return []
    
    // Find the lowest score
    const minScore = Math.min(...teamScoresCalc.map(t => t.score))
    // Get all teams with that score
    const tied = teamScoresCalc.filter(t => t.score === minScore)
    
    // Only return if there's a tie (more than 1 team)
    return tied.length > 1 ? tied : []
  }, [currentEvent?.is_doubles, doublesTeams, teamScores, doublesScoringType, effectiveHandicaps])
  
  
  
  // Initialize scores and attendance selection from attendance
  useEffect(() => {
    if (currentEvent?.attendance) {
      const initialScores: Record<string, string> = {}
      const initialAttendance = new Set<string>()
      const initialSanctioned = new Set<string>()
      currentEvent.attendance.forEach(a => {
        initialAttendance.add(a.player_id)
        if (a.sanctioned) {
          initialSanctioned.add(a.player_id)
        }
        if (a.score !== null) {
          initialScores[a.player_id] = String(a.score)
        }
      })
      setScores(initialScores)
      setSelectedAttendance(initialAttendance)
      setSanctionedPlayers(initialSanctioned)
    }
  }, [currentEvent])
  
// Initialize team scores
  useEffect(() => {
    const initialTeamScores: Record<string, string> = {}
    initialDoublesTeams.forEach(t => {
      if (t.score !== null && t.score !== undefined) {
        initialTeamScores[t.id] = String(t.score)
      }
    })
    setTeamScores(initialTeamScores)
  }, [initialDoublesTeams])
  
  // Reconstruct teams from card_assignments if doublesTeams is empty but cards are saved
  // This handles the case where teams were saved with cards but not in doubles_teams table
  useEffect(() => {
    if (currentEvent?.is_doubles && currentEvent.cards_saved && initialDoublesTeams.length === 0 && cardAssignments.length > 0) {
      const reconstructedTeams: DoublesTeamWithPlayers[] = []
      let teamIdx = 0
      
      for (const card of cardAssignments) {
        if (card.teams) {
          for (const cardTeam of card.teams) {
            const player1 = players.find(p => p.id === cardTeam.player1_id)
            const player2 = players.find(p => p.id === cardTeam.player2_id)
            if (player1 && player2) {
              // Calculate team handicap: (Player A's effective HC + Player B's effective HC) / 3
              // Non-members use best member's handicap
              const h1 = effectiveHandicaps.get(cardTeam.player1_id) || 0
              const h2 = effectiveHandicaps.get(cardTeam.player2_id) || 0
              const teamHandicap = calculateTeamHandicap(h1, h2)
              
              reconstructedTeams.push({
                id: `reconstructed-${teamIdx++}`,
                event_id: null,
                week_id: currentEvent.id,
                player1_id: cardTeam.player1_id,
                player2_id: cardTeam.player2_id,
                team_handicap: teamHandicap,
                score: null,
                created_at: new Date().toISOString(),
                player1: { id: player1.id, name: player1.name, is_member: player1.is_member, created_at: player1.created_at },
                player2: { id: player2.id, name: player2.name, is_member: player2.is_member, created_at: player2.created_at }
              })
            }
          }
        }
      }
      
      if (reconstructedTeams.length > 0) {
        setDoublesTeams(reconstructedTeams)
      }
    }
  }, [currentEvent, initialDoublesTeams, cardAssignments, players, effectiveHandicaps])

  if (!currentEvent) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Current Event</h3>
          <p className="text-muted-foreground">
            Create a new event in the Events tab to get started.
          </p>
        </CardContent>
      </Card>
    )
  }

  const attendingPlayers = currentEvent.attendance.map(a => a.player)
  
  // Randomize doubles teams
  const randomizeTeams = () => {
    const shuffled = [...attendingPlayers].sort(() => Math.random() - 0.5)
    const teams: { player1: Player; player2: Player; handicap: number }[] = []
    let wild: string | null = null
    
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      const p1 = shuffled[i]
      const p2 = shuffled[i + 1]
      const h1 = effectiveHandicaps.get(p1.id) || 0
      const h2 = effectiveHandicaps.get(p2.id) || 0
      teams.push({
        player1: p1,
        player2: p2,
        handicap: calculateTeamHandicap(h1, h2)
      })
    }
    
    // Handle odd player (Wild Man)
    if (shuffled.length % 2 === 1) {
      wild = shuffled[shuffled.length - 1].id
      setWildMan(wild)
    } else {
      setWildMan(null)
    }
    
    // Update local state (not saved to DB yet)
    const newTeams = teams.map((t, idx) => ({
      id: `temp-${idx}`,
      event_id: null,
      week_id: currentEvent.id,
      player1_id: t.player1.id,
      player2_id: t.player2.id,
      team_handicap: t.handicap,
      score: null,
      created_at: new Date().toISOString(),
      player1: t.player1,
      player2: t.player2
    }))
    
    setDoublesTeams(newTeams)
  }
  
  // Randomize cards (4 players per hole, overflow goes to hole 1)
  // Special rule: Mr. B always goes to hole 1 when present
  const randomizeCards = () => {
    const holes = [1, 3, 5, 7, 9, 11, 13, 15, 17, 2, 4, 6, 8, 10, 12, 14, 16, 18]
    const assignments: CardAssignment[] = []
    
    // Find Mr. B if he's attending
    // Match variations: "Mr. B", "Mr B", "Mr.B", "mr. b", etc.
    const mrB = attendingPlayers.find(p => {
      const normalized = p.name.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim()
      return normalized === "mr b" || normalized === "mrb"
    })
    
    // Find Joe Reed and Connor Reed - they must always be on the same card
    const joeReed = attendingPlayers.find(p => p.name.toLowerCase() === "joe reed")
    const connorReed = attendingPlayers.find(p => p.name.toLowerCase() === "connor reed")
    const reedsAttending = joeReed && connorReed
    
    if (currentEvent.is_doubles) {
      // For doubles: 2 teams (4 players) per card
      // Leftover team + wild man get their own card
      // Order of operations:
      // 1. Place Reed teams on hole 3 FIRST (remove from pool)
      // 2. Randomize remaining teams into cards
      // 3. Assign Mr. B's card to hole 1, randomize other holes
      
      // Find teams with Mr. B, Joe Reed, Connor Reed
      const mrBTeam = mrB ? doublesTeams.find(t => t.player1_id === mrB.id || t.player2_id === mrB.id) : null
      const joeTeam = joeReed ? doublesTeams.find(t => t.player1_id === joeReed.id || t.player2_id === joeReed.id) : null
      const connorTeam = connorReed ? doublesTeams.find(t => t.player1_id === connorReed.id || t.player2_id === connorReed.id) : null
      const reedsOnSameTeam = joeTeam && connorTeam && joeTeam.id === connorTeam.id
      
      // Step 1: Get teams NOT involving Reeds (for randomization)
      const reedTeamIds = new Set<string>()
      if (reedsAttending) {
        if (joeTeam) reedTeamIds.add(joeTeam.id)
        if (connorTeam && !reedsOnSameTeam) reedTeamIds.add(connorTeam.id)
      }
      const nonReedTeams = doublesTeams.filter(t => !reedTeamIds.has(t.id))
      
      // Shuffle non-Reed teams first (we may need one for hole 3 if Reeds are on same team)
      const shuffledNonReedTeams = [...nonReedTeams].sort(() => Math.random() - 0.5)
      
      // Step 2: Place Reed teams on hole 3 FIRST
      // Track which team gets paired with Reeds if they're on same team
      let reedPartnerTeam: typeof doublesTeams[0] | null = null
      
      if (reedsAttending && (joeTeam || connorTeam)) {
        const hole3Players: string[] = []
        const hole3Teams: { player1_id: string; player2_id: string }[] = []
        
        if (joeTeam) {
          hole3Players.push(joeTeam.player1_id, joeTeam.player2_id)
          hole3Teams.push({ player1_id: joeTeam.player1_id, player2_id: joeTeam.player2_id })
        }
        if (connorTeam && !reedsOnSameTeam) {
          hole3Players.push(connorTeam.player1_id, connorTeam.player2_id)
          hole3Teams.push({ player1_id: connorTeam.player1_id, player2_id: connorTeam.player2_id })
        }
        
        // If Reeds are on the same team, we need another team to fill the card
        if (reedsOnSameTeam && shuffledNonReedTeams.length > 0) {
          reedPartnerTeam = shuffledNonReedTeams[0]
          hole3Players.push(reedPartnerTeam.player1_id, reedPartnerTeam.player2_id)
          hole3Teams.push({ player1_id: reedPartnerTeam.player1_id, player2_id: reedPartnerTeam.player2_id })
        }
        
        assignments.push({
          hole: 3,
          players: hole3Players,
          teams: hole3Teams
        })
      }
      
      // Step 3: Get remaining teams for other cards (exclude Reed teams AND their partner if applicable)
      const remainingTeams = shuffledNonReedTeams.filter(t => !reedPartnerTeam || t.id !== reedPartnerTeam.id)
      
      // remainingTeams is already shuffled (came from shuffledNonReedTeams)
      
      // Group into cards (2 teams per card)
      const numFullCards = Math.floor(remainingTeams.length / 2)
      const hasLeftoverTeam = remainingTeams.length % 2 === 1
      const leftoverTeam = hasLeftoverTeam ? remainingTeams[remainingTeams.length - 1] : null
      
      // Find Mr. B's position in remaining teams
      const mrBTeamIdx = mrBTeam ? remainingTeams.findIndex(t => t.id === mrBTeam.id) : -1
      const mrBCardIdx = mrBTeamIdx >= 0 ? Math.floor(mrBTeamIdx / 2) : -1
      const mrBIsLeftover = mrBTeam && leftoverTeam && leftoverTeam.id === mrBTeam.id
      
      // Step 3: Available holes (skip hole 3 if Reeds are there)
      // Holes should be used in order: all odd first, then even
      const availableHoles = (reedsAttending && (joeTeam || connorTeam))
        ? holes.filter(h => h !== 3)
        : [...holes]
      
      // Calculate total cards needed
      const totalCardsNeeded = numFullCards + (hasLeftoverTeam && wildMan ? 1 : 0) + (reedsAttending ? 1 : 0)
      
      // Take only the holes we need, in order (odd first, then even)
      // Hole 1 is for Mr. B, hole 3 is for Reeds (if applicable)
      const holesForCards = availableHoles.slice(0, totalCardsNeeded)
      
      // Build cards and assign holes in order
      const mrBIsWildMan = wildMan && mrB && wildMan === mrB.id
      
      // Assign holes sequentially, but Mr. B gets hole 1
      // Reserve the last hole for leftover team + wild man if applicable
      const holesForFullCards = (leftoverTeam && wildMan) 
        ? holesForCards.slice(0, -1)  // Reserve last hole for leftover + wildman
        : holesForCards
      
      let nextHoleIdx = 1  // Start at index 1 (skip hole 1 which is reserved for Mr. B)
      
      for (let c = 0; c < numFullCards; c++) {
        const cardTeams = remainingTeams.slice(c * 2, c * 2 + 2)
        const cardPlayers = cardTeams.flatMap(t => [t.player1_id, t.player2_id])
        const cardTeamsData = cardTeams.map(t => ({ player1_id: t.player1_id, player2_id: t.player2_id }))
        
        let hole: number
        if (c === mrBCardIdx) {
          // Mr. B's card gets hole 1
          hole = holesForFullCards[0]
        } else {
          // Other cards get the next sequential hole
          hole = holesForFullCards[nextHoleIdx]
          nextHoleIdx++
        }
        
        assignments.push({
          hole,
          players: cardPlayers,
          teams: cardTeamsData
        })
      }
      
      // Handle leftover team and wild man - they go on the LAST hole
      const lastHole = holesForCards[holesForCards.length - 1]
      const hole1 = holesForCards[0]
      
      if (mrBIsWildMan && leftoverTeam) {
        // Mr. B is wild man: leftover team + Mr. B go to hole 1
        // Move whoever is on hole 1 to the last hole
        const hole1Assignment = assignments.find(a => a.hole === hole1)
        if (hole1Assignment) {
          hole1Assignment.hole = lastHole
        }
        assignments.push({
          hole: hole1,
          players: [leftoverTeam.player1_id, leftoverTeam.player2_id, wildMan],
          teams: [{ player1_id: leftoverTeam.player1_id, player2_id: leftoverTeam.player2_id }]
        })
      } else if (leftoverTeam && wildMan) {
        // Leftover team + wild man get their own card on the LAST hole
        assignments.push({
          hole: lastHole,
          players: [leftoverTeam.player1_id, leftoverTeam.player2_id, wildMan],
          teams: [{ player1_id: leftoverTeam.player1_id, player2_id: leftoverTeam.player2_id }]
        })
      } else if (leftoverTeam && assignments.length > 0) {
        // No wild man: leftover team joins hole 1 card
        const hole1Card = assignments.find(a => a.hole === hole1)
        if (hole1Card) {
          hole1Card.players.push(leftoverTeam.player1_id, leftoverTeam.player2_id)
          hole1Card.teams = hole1Card.teams || []
          hole1Card.teams.push({ player1_id: leftoverTeam.player1_id, player2_id: leftoverTeam.player2_id })
        }
      } else if (wildMan) {
        // No leftover team, wild man joins hole 1
        const hole1Card = assignments.find(a => a.hole === hole1)
        if (hole1Card) {
          hole1Card.players.push(wildMan)
        }
      }
      
      // Sort assignments by hole order
      assignments.sort((a, b) => holes.indexOf(a.hole) - holes.indexOf(b.hole))
    } else {
      // ===================== SINGLES CARD GENERATION =====================
      // Prefer cards of 4, minimum 3 per card. Special rules:
      //  - Mr. B goes on hole 1
      //  - Joe Reed + Connor Reed go together on hole 3
      //  - PDGA sanctioned players (>= 2 opted in) must be grouped onto sanctioned
      //    cards. A card needs >= 3 sanctioned players to be a valid sanctioned card:
      //      * 1 sanctioned  -> not enough, falls through to normal rules
      //      * 2 sanctioned  -> kept together, filled with non-sanctioned to reach >= 3
      //      * 3 sanctioned  -> valid; filled to 4 with a non-sanctioned player if available
      //      * 4+ sanctioned -> partitioned like normal (5 stays as one card of 5)
      //    If Mr. B is sanctioned, the first sanctioned card is placed on hole 1.
      //    If either Reed is sanctioned, the hole-3 "Reeds together" rule is dropped.
      
      const totalPlayers = attendingPlayers.length
      const holesUsed: number[] = []
      
      // Partition n players into card sizes (prefer 4s, min 3; 5 stays as a single card).
      // For n <= 2 returns [n] (the caller merges those as needed).
      const partitionSizes = (n: number): number[] => {
        if (n <= 0) return []
        if (n <= 2) return [n]
        if (n === 5) return [5]
        const remainder = n % 4
        let numFours = Math.floor(n / 4)
        let numThrees = 0
        if (remainder === 1 && numFours >= 2) {
          numFours -= 2
          numThrees = 3
        } else if (remainder === 2) {
          numFours -= 1
          numThrees = 2
        } else if (remainder === 3) {
          numThrees = 1
        }
        const sizes: number[] = []
        for (let i = 0; i < numFours; i++) sizes.push(4)
        for (let i = 0; i < numThrees; i++) sizes.push(3)
        return sizes
      }
      
      if (totalPlayers < 3) {
        // Less than 3 total - just put everyone on hole 1
        assignments.push({ hole: 1, players: attendingPlayers.map(p => p.id) })
      } else {
        const sanctionedAttendees = attendingPlayers.filter(p => sanctionedPlayers.has(p.id))
        const nonSanctionedCount = attendingPlayers.length - sanctionedAttendees.length
        
        // Determine whether a VALID sanctioned layout is even possible. Keeping the
        // sanctioned group together is only allowed if it doesn't force a card outside
        // the 3-5 size rule. If it's impossible (e.g. 4 sanctioned + only 2 others = 6
        // total, which can only be a valid 3/3), fall back to normal grouping.
        const sanctionedFeasible = (() => {
          if (sanctionedAttendees.length < 2) return false
          const sizes = partitionSizes(sanctionedAttendees.length)
          // Players needed to raise any undersized (2-player) card up to the minimum of 3
          const mandatory = sizes.reduce((sum, s) => sum + Math.max(0, 3 - s), 0)
          if (nonSanctionedCount < mandatory) return false
          const leftover = nonSanctionedCount - mandatory
          if (leftover === 0 || leftover >= 3) return true
          // 1-2 leftover non-sanctioned: they must fit into the room remaining on the
          // sanctioned cards (each capped at 5) after the mandatory fill.
          const room = sizes.reduce((sum, s) => sum + (5 - Math.max(s, 3)), 0)
          return leftover <= room
        })()
        
        const useSanctioned = sanctionedFeasible
        
        // Whether special players still need their reserved holes
        const mrBSanctioned = !!(mrB && sanctionedPlayers.has(mrB.id))
        const joeSanctioned = !!(joeReed && sanctionedPlayers.has(joeReed.id))
        const connorSanctioned = !!(connorReed && sanctionedPlayers.has(connorReed.id))
        // Reeds-together (hole 3) rule only applies if BOTH Reeds are non-sanctioned
        const reedsRuleApplies = !!reedsAttending && !joeSanctioned && !connorSanctioned
        // Mr. B needs hole 1 reserved for his normal card only when he is NOT sanctioned
        const mrBNeedsHole1 = !!mrB && !mrBSanctioned
        
        let nonSanctionedPool: Player[]
        
        if (useSanctioned) {
          // Order sanctioned players; put Mr. B first so he lands in the first sanctioned card
          const sanctionedShuffled = [...sanctionedAttendees].sort(() => Math.random() - 0.5)
          if (mrBSanctioned) {
            const i = sanctionedShuffled.findIndex(p => p.id === mrB!.id)
            if (i > 0) {
              const [b] = sanctionedShuffled.splice(i, 1)
              sanctionedShuffled.unshift(b)
            }
          }
          
          const sSizes = partitionSizes(sanctionedAttendees.length)
          
          // Build sanctioned cards from sanctioned players only
          let sIdx = 0
          const sanctionedCards: { players: string[] }[] = []
          for (const size of sSizes) {
            sanctionedCards.push({ players: sanctionedShuffled.slice(sIdx, sIdx + size).map(p => p.id) })
            sIdx += size
          }
          
          // Non-sanctioned players, shuffled
          const nsShuffled = attendingPlayers
            .filter(p => !sanctionedPlayers.has(p.id))
            .sort(() => Math.random() - 0.5)
          
          // Reserve Mr. B / both Reeds from the fill pool so their normal cards are intact
          const reserved = new Set<string>()
          if (mrBNeedsHole1) reserved.add(mrB!.id)
          if (reedsRuleApplies) {
            reserved.add(joeReed!.id)
            reserved.add(connorReed!.id)
          }
          const fillQueue = nsShuffled.filter(p => !reserved.has(p.id))
          
          // Only fill sanctioned cards that are BELOW the minimum of 3 (this happens
          // solely when exactly 2 players are sanctioned). Sanctioned cards of 3+ are
          // left intact so sanctioned players stay separate whenever the rules allow.
          // Any remaining non-sanctioned "strays" (1-2 that can't form their own card)
          // are absorbed later in the non-sanctioned distribution step.
          let fillIdx = 0
          for (const card of sanctionedCards) {
            while (card.players.length < 3 && fillIdx < fillQueue.length) {
              card.players.push(fillQueue[fillIdx++].id)
            }
          }
          
          // Assign holes to sanctioned cards (Mr. B's first card -> hole 1 when sanctioned)
          sanctionedCards.forEach((card, idx) => {
            let hole: number
            if (mrBSanctioned && idx === 0) {
              hole = 1
            } else {
              hole = holes.find(h =>
                !holesUsed.includes(h) &&
                !(mrBNeedsHole1 && h === 1) &&
                !(reedsRuleApplies && h === 3)
              )!
            }
            holesUsed.push(hole)
            assignments.push({ hole, players: card.players, sanctioned: true })
          })
          
          // Remaining non-sanctioned players go to normal cards
          const usedFillIds = new Set(fillQueue.slice(0, fillIdx).map(p => p.id))
          nonSanctionedPool = nsShuffled.filter(p => !usedFillIds.has(p.id))
        } else {
          nonSanctionedPool = [...attendingPlayers]
        }
        
        // ===== Distribute the non-sanctioned pool (honoring Mr. B & Reeds rules) =====
        const poolIds = new Set(nonSanctionedPool.map(p => p.id))
        const mrBInPool = mrBNeedsHole1 && poolIds.has(mrB!.id) && !holesUsed.includes(1)
        const reedsInPool = reedsRuleApplies && poolIds.has(joeReed!.id) && poolIds.has(connorReed!.id)
        
        if (nonSanctionedPool.length >= 3) {
          const specialIds = new Set<string>()
          if (mrBInPool) specialIds.add(mrB!.id)
          if (reedsInPool) {
            specialIds.add(joeReed!.id)
            specialIds.add(connorReed!.id)
          }
          const shuffledPlayers = nonSanctionedPool
            .filter(p => !specialIds.has(p.id))
            .sort(() => Math.random() - 0.5)
          
          const cardSizes = partitionSizes(nonSanctionedPool.length)
          let playerIndex = 0
          
          // Hole 1 card (Mr. B)
          if (mrBInPool) {
            const size = cardSizes.shift() || 4
            const cardPlayers: string[] = [mrB!.id]
            const need = size - cardPlayers.length
            cardPlayers.push(...shuffledPlayers.slice(playerIndex, playerIndex + need).map(p => p.id))
            playerIndex += need
            assignments.push({ hole: 1, players: cardPlayers })
            holesUsed.push(1)
          }
          
          // Hole 3 card (Reeds together)
          if (reedsInPool && cardSizes.length > 0 && !holesUsed.includes(3)) {
            const size = cardSizes.shift() || 4
            const cardPlayers: string[] = [joeReed!.id, connorReed!.id]
            const need = size - cardPlayers.length
            cardPlayers.push(...shuffledPlayers.slice(playerIndex, playerIndex + need).map(p => p.id))
            playerIndex += need
            assignments.push({ hole: 3, players: cardPlayers })
            holesUsed.push(3)
          }
          
          // Remaining normal cards fill the next available holes in order
          for (const size of cardSizes) {
            const cardPlayers = shuffledPlayers.slice(playerIndex, playerIndex + size).map(p => p.id)
            playerIndex += size
            const hole = holes.find(h => !holesUsed.includes(h))!
            holesUsed.push(hole)
            assignments.push({ hole, players: cardPlayers })
          }
        } else if (nonSanctionedPool.length > 0) {
          // 1-2 leftover non-sanctioned players that can't form their own card (min 3).
          // Slot each into an existing card that still has room (keeping cards <= 5),
          // preferring the smallest such card so we don't overfill. This is the only
          // situation where a non-sanctioned player joins a sanctioned card.
          for (const stray of nonSanctionedPool) {
            const withRoom = assignments
              .filter(a => a.players.length < 5)
              .sort((a, b) => a.players.length - b.players.length)
            if (withRoom.length > 0) {
              withRoom[0].players.push(stray.id)
            } else {
              const hole = holes.find(h => !holesUsed.includes(h))!
              holesUsed.push(hole)
              assignments.push({ hole, players: [stray.id] })
            }
          }
        }
      }
      
      // Sort assignments by hole order
      assignments.sort((a, b) => holes.indexOf(a.hole) - holes.indexOf(b.hole))
    }
    
    setCardAssignments(assignments)
  }
  
  // Save cards to database (pushes to public)
  const handleSaveCards = async () => {
    if (cardAssignments.length === 0) {
      alert("Please randomize cards first")
      return
    }
    
    setLoading(true)
    try {
      // If doubles, save teams first
      if (currentEvent.is_doubles && doublesTeams.length > 0) {
        await saveDoublesTeams(
          currentEvent.id,
          doublesTeams.map(t => ({
            player1_id: t.player1_id,
            player2_id: t.player2_id,
            team_handicap: t.team_handicap || 0
          }))
        )
      }
      
      await saveCards(currentEvent.id, cardAssignments)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }
  
  // Save scores
  const handleSaveScores = async () => {
    setLoading(true)
    try {
      if (currentEvent.is_doubles) {
        // For doubles, we need to ensure teams are saved to the database first
        // Reconstructed teams from card_assignments need to be persisted
        const teamsToSave = doublesTeams
          .filter(t => t.id.startsWith('reconstructed-') || t.id.startsWith('temp-'))
          .map(t => ({
            player1_id: t.player1_id,
            player2_id: t.player2_id,
            team_handicap: t.team_handicap
          }))
        
        if (teamsToSave.length > 0) {
          // Save teams to database and get back the real IDs
          const result = await saveDoublesTeams(currentEvent.id, teamsToSave)
          if (result.success && result.teams) {
            // Now update scores using the real team IDs
            for (const savedTeam of result.teams) {
              // Find the matching reconstructed team by player IDs
              const originalTeam = doublesTeams.find(t => 
                t.player1_id === savedTeam.player1_id && t.player2_id === savedTeam.player2_id
              )
              if (originalTeam) {
                const score = teamScores[originalTeam.id]
                if (score) {
                  await updateDoublesTeamScore(savedTeam.id, parseInt(score))
                }
              }
            }
          }
        } else {
          // Teams already exist in database, update scores directly
          for (const team of doublesTeams) {
            const score = teamScores[team.id]
            if (score) {
              await updateDoublesTeamScore(team.id, parseInt(score))
            }
          }
        }
        // Save doubles CTP team, scoring type, and playoff winner
        await updateDoublesCTPAndScoringType(
          currentEvent.id, 
          doublesCTPTeam || null, 
          doublesScoringType,
          playoffWinnerTeam || null
        )
      } else {
        // Save individual scores. Build from the full attendance set so players
        // without a score are still persisted (with their sanctioned flag).
        const attendanceData = Array.from(selectedAttendance).map(playerId => ({
          player_id: playerId,
          score: scores[playerId] ? parseInt(scores[playerId]) : null,
          sanctioned: sanctionedPlayers.has(playerId)
        }))
        await updateAttendance(currentEvent.id, attendanceData)
        // Save CTP winner and playoff winner for singles
        await updateCTPWinner(currentEvent.id, ctpWinner || null, playoffWinner || null)
      }
      
      router.refresh()
    } finally {
      setLoading(false)
    }
  }
  
  // Submit event (finalize to public)
  const handleSubmitEvent = async () => {
    setLoading(true)
    try {
      // Save all data first
      await handleSaveScores()
      await submitEvent(currentEvent.id)
      setShowSubmitConfirm(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }
  
  const getPlayerName = (playerId: string) => {
    return players.find(p => p.id === playerId)?.name || "Unknown"
  }
  
  // Toggle attendance selection
  const toggleAttendance = (playerId: string) => {
    setSelectedAttendance(prev => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else {
        next.add(playerId)
      }
      return next
    })
    // If a player is removed from attendance, also clear their sanctioned opt-in
    setSanctionedPlayers(prev => {
      if (!selectedAttendance.has(playerId)) return prev // was being added, leave as-is
      const next = new Set(prev)
      next.delete(playerId)
      return next
    })
  }
  
  // Toggle sanctioned (PDGA) opt-in for a player
  const toggleSanctioned = (playerId: string) => {
    setSanctionedPlayers(prev => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else {
        next.add(playerId)
      }
      return next
    })
  }
  
  // Quick-add a new player during check-in and auto-check them in
  const handleQuickAddPlayer = async () => {
    if (!quickAddName.trim()) return
    setAddingPlayer(true)
    try {
      const result = await addPlayer(quickAddName.trim(), quickAddIsMember)
      if (result.success && result.player) {
        setPlayerList(prev => [...prev, result.player!].sort((a, b) => a.name.localeCompare(b.name)))
        setSelectedAttendance(prev => new Set(prev).add(result.player!.id))
        setQuickAddName("")
        setQuickAddIsMember(false)
      }
    } finally {
      setAddingPlayer(false)
    }
  }
  
  // Save attendance changes
  const handleSaveAttendance = async () => {
    setLoading(true)
    try {
      // Build attendance data, preserving existing scores and sanctioned opt-ins
      const attendanceData = Array.from(selectedAttendance).map(playerId => ({
        player_id: playerId,
        score: scores[playerId] ? parseInt(scores[playerId]) : null,
        sanctioned: sanctionedPlayers.has(playerId)
      }))
      
      await updateAttendance(currentEvent.id, attendanceData)
      setEditAttendanceOpen(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }
  
  // Get unassigned players (attending but not on any card)
  const getUnassignedPlayers = () => {
    const assignedIds = new Set(cardAssignments.flatMap(c => c.players))
    return attendingPlayers.filter(p => !assignedIds.has(p.id))
  }
  
  // Remove player from a card
  const removePlayerFromCard = (cardIndex: number, playerId: string) => {
    setCardAssignments(prev => {
      const updated = [...prev]
      updated[cardIndex] = {
        ...updated[cardIndex],
        players: updated[cardIndex].players.filter(id => id !== playerId)
      }
      return updated
    })
  }
  
  // Add player to a card
  const addPlayerToCard = (cardIndex: number, playerId: string) => {
    setCardAssignments(prev => {
      const updated = [...prev]
      updated[cardIndex] = {
        ...updated[cardIndex],
        players: [...updated[cardIndex].players, playerId]
      }
      return updated
    })
  }
  
  // Save card edits
  const handleSaveCardEdits = async () => {
    setLoading(true)
    try {
      await saveCards(currentEvent.id, cardAssignments)
      setEditingCards(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }
  
  // Get players who are not on any team (for doubles editing)
  const getUnteamedPlayers = () => {
    const teamedPlayerIds = new Set(doublesTeams.flatMap(t => [t.player1_id, t.player2_id]))
    return attendingPlayers.filter(p => !teamedPlayerIds.has(p.id))
  }
  
  // Remove a player from their team (unassign)
  const removePlayerFromTeam = (teamId: string, playerId: string) => {
    setDoublesTeams(prev => {
      const team = prev.find(t => t.id === teamId)
      if (!team) return prev
      
      // Determine who the remaining player is
      const remainingPlayerId = team.player1_id === playerId ? team.player2_id : team.player1_id
      const remainingPlayer = team.player1_id === playerId ? team.player2 : team.player1
      
      // Remove this team and create a single-player "team" for the remaining player
      // Or just remove the team entirely and add both to unteamed
      return prev.filter(t => t.id !== teamId)
    })
  }
  
  // Create a new team from two unteamed players
  const createTeamFromPlayers = (player1Id: string, player2Id: string) => {
    const player1 = attendingPlayers.find(p => p.id === player1Id)
    const player2 = attendingPlayers.find(p => p.id === player2Id)
    if (!player1 || !player2) return
    
    const p1Hc = effectiveHandicaps[player1Id] || 0
    const p2Hc = effectiveHandicaps[player2Id] || 0
    const teamHandicap = calculateTeamHandicap(p1Hc, p2Hc)
    
    const newTeam: DoublesTeamWithPlayers = {
      id: `new-${Date.now()}`,
      week_id: currentEvent.id,
      event_id: null,
      player1_id: player1Id,
      player2_id: player2Id,
      player1: player1,
      player2: player2,
      team_handicap: teamHandicap,
      score: null,
      created_at: new Date().toISOString()
    }
    
    setDoublesTeams(prev => [...prev, newTeam])
  }
  
  // Save team edits
  const handleSaveTeamEdits = async () => {
    setLoading(true)
    try {
      const teamsToSave = doublesTeams.map(t => ({
        player1_id: t.player1_id,
        player2_id: t.player2_id,
        team_handicap: t.team_handicap || 0
      }))
      await saveDoublesTeams(currentEvent.id, teamsToSave)
      setEditingTeams(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Event Header */}
      <Card className="border-primary">
        <CardHeader>
          <div>
            <CardTitle className="flex flex-wrap items-center gap-2">
              <span className="text-xl sm:text-3xl font-bold text-primary">Event {currentEvent.week_number}</span>
              {currentEvent.is_doubles && (
                <Badge variant="default" className="bg-primary">
                  <Users2 className="h-3 w-3 mr-1" />
                  Doubles
                </Badge>
              )}
              {currentEvent.cards_saved && (
                <Badge variant="default" className="bg-accent">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Cards Saved
                </Badge>
              )}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4 shrink-0" />
                {format(new Date(currentEvent.date), "MMM d, yyyy")}
              </span>
              {currentEvent.course_name && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {currentEvent.course_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users2 className="h-4 w-4 shrink-0" />
                {attendingPlayers.length} Players
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {/* Check-in prompt when nobody is checked in yet */}
      {attendingPlayers.length === 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-6 text-center space-y-3">
            <UserPlus className="h-10 w-10 mx-auto text-primary" />
            <div>
              <h3 className="font-semibold">No players checked in yet</h3>
              <p className="text-sm text-muted-foreground">
                Check players in to start building cards for this event.
              </p>
            </div>
            <Button className="gap-2" onClick={() => setEditAttendanceOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Check In Players
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Phase 1: Before Round - Randomize & Save Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Phase 1: Before Round</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {currentEvent.is_doubles && (
              <Button onClick={randomizeTeams} variant="outline" size="sm" className="gap-1 text-xs sm:text-sm sm:gap-2">
                <Shuffle className="h-4 w-4 shrink-0" />
                <span className="hidden xs:inline">Randomize</span> Teams
              </Button>
            )}
            <Button onClick={randomizeCards} variant="outline" size="sm" className="gap-1 text-xs sm:text-sm sm:gap-2">
              <Shuffle className="h-4 w-4 shrink-0" />
              <span className="hidden xs:inline">Randomize</span> Cards
            </Button>
            <Button 
              onClick={handleSaveCards} 
              disabled={loading || cardAssignments.length === 0}
              size="sm"
              className="gap-1 text-xs sm:text-sm sm:gap-2"
            >
              <Save className="h-4 w-4 shrink-0" />
              Save Cards
            </Button>
            
            {/* Check In Players Button */}
            <Dialog open={editAttendanceOpen} onOpenChange={setEditAttendanceOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 text-xs sm:text-sm sm:gap-2">
                  <UserPlus className="h-4 w-4 shrink-0" />
                  Check In Players
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Check In Players ({selectedAttendance.size} checked in)</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {!currentEvent.is_doubles && (
                    <p className="text-xs text-muted-foreground">
                      Check players in, then tap the PDGA button to opt them into sanctioned play.
                    </p>
                  )}
                  
                  {/* Quick Add New Player */}
                  <div className="p-3 border border-dashed border-primary/50 rounded-lg bg-primary/5">
                    <div className="flex items-center gap-2 mb-2">
                      <UserPlus className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Add New Player</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        placeholder="Player name"
                        value={quickAddName}
                        onChange={(e) => setQuickAddName(e.target.value)}
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                            e.preventDefault()
                            handleQuickAddPlayer()
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                          <Checkbox
                            checked={quickAddIsMember}
                            onCheckedChange={(checked) => setQuickAddIsMember(checked as boolean)}
                          />
                          Member
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleQuickAddPlayer}
                          disabled={addingPlayer || !quickAddName.trim()}
                        >
                          {addingPlayer ? "Adding..." : "Add"}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto p-2 border rounded-lg">
                    {playerList.map(player => {
                      const isAttending = selectedAttendance.has(player.id)
                      const isSanctioned = sanctionedPlayers.has(player.id)
                      return (
                        <div
                          key={player.id}
                          className={`flex items-center gap-2 p-2 rounded transition-colors ${
                            isAttending
                              ? "bg-primary/20 border border-primary"
                              : "bg-muted/50 hover:bg-muted"
                          }`}
                        >
                          <div
                            className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                            onClick={() => toggleAttendance(player.id)}
                          >
                            <Checkbox
                              checked={isAttending}
                              onCheckedChange={() => toggleAttendance(player.id)}
                            />
                            <span className="text-sm truncate">{player.name}</span>
                          </div>
                          {/* Sanctioned opt-in: singles only, and only for checked-in players */}
                          {!currentEvent.is_doubles && isAttending && (
                            <button
                              type="button"
                              onClick={() => toggleSanctioned(player.id)}
                              aria-pressed={isSanctioned}
                              aria-label={`Toggle sanctioned play for ${player.name}`}
                              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold border transition-colors ${
                                isSanctioned
                                  ? "bg-accent text-accent-foreground border-accent"
                                  : "bg-transparent text-muted-foreground border-border hover:bg-muted"
                              }`}
                            >
                              PDGA
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <Button 
                    onClick={handleSaveAttendance} 
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? "Saving..." : "Save Attendance"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* Edit Cards Button - only show when cards are saved */}
            {currentEvent.cards_saved && (
              <Button 
                variant={editingCards ? "default" : "outline"} 
                size="sm" 
                className="gap-1 text-xs sm:text-sm sm:gap-2"
                onClick={() => setEditingCards(!editingCards)}
              >
                <Edit2 className="h-4 w-4 shrink-0" />
                {editingCards ? "Done Editing" : "Edit Cards"}
              </Button>
            )}
          </div>
          
          {/* Show Teams if Doubles */}
          {currentEvent.is_doubles && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Teams</h4>
                <div className="flex gap-2">
                  {editingTeams && (
                    <Button 
                      onClick={handleSaveTeamEdits} 
                      size="sm" 
                      disabled={loading || getUnteamedPlayers().length > 0}
                      className="gap-1"
                    >
                      <Save className="h-4 w-4" />
                      Save Teams
                    </Button>
                  )}
                  <Button
                    variant={editingTeams ? "default" : "outline"}
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      setEditingTeams(!editingTeams)
                      setSelectedPlayerForTeam(null)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    {editingTeams ? "Done Editing" : "Edit Teams"}
                  </Button>
                </div>
              </div>
              
              {/* Show unteamed players when editing */}
              {editingTeams && getUnteamedPlayers().length > 0 && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
                  <div className="font-medium text-yellow-600 mb-2">
                    Unteamed Players ({getUnteamedPlayers().length})
                    {getUnteamedPlayers().length >= 2 && (
                      <span className="text-xs font-normal ml-2">- Click two players to create a team</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getUnteamedPlayers().map(player => (
                      <Badge 
                        key={player.id} 
                        variant="outline" 
                        className={`cursor-pointer hover:bg-yellow-500/20 ${
                          selectedPlayerForTeam === player.id 
                            ? "bg-primary text-primary-foreground border-primary" 
                            : "text-yellow-600 border-yellow-500"
                        }`}
                        onClick={() => {
                          if (selectedPlayerForTeam === player.id) {
                            // Deselect if clicking the same player
                            setSelectedPlayerForTeam(null)
                          } else if (selectedPlayerForTeam) {
                            // Create team with the two players
                            createTeamFromPlayers(selectedPlayerForTeam, player.id)
                            setSelectedPlayerForTeam(null)
                          } else {
                            // Select this player
                            setSelectedPlayerForTeam(player.id)
                          }
                        }}
                      >
                        {player.name}
                        {selectedPlayerForTeam === player.id && " (selected)"}
                      </Badge>
                    ))}
                  </div>
                  {getUnteamedPlayers().length >= 2 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-xs text-muted-foreground">Quick pair:</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs"
                        onClick={() => {
                          const unteamed = getUnteamedPlayers()
                          if (unteamed.length >= 2) {
                            createTeamFromPlayers(unteamed[0].id, unteamed[1].id)
                          }
                        }}
                      >
                        Pair first two
                      </Button>
                    </div>
                  )}
                  {getUnteamedPlayers().length === 1 && (
                    <div className="mt-2 text-xs text-yellow-600">
                      One player remaining - they will be the Wild Man
                    </div>
                  )}
                </div>
              )}
              
              {doublesTeams.length === 0 && !editingTeams && (
                <div className="p-4 bg-muted/50 rounded-lg text-center text-muted-foreground">
                  <p>No teams created yet. Click &quot;Edit Teams&quot; to pair players.</p>
                </div>
              )}
              
              {doublesTeams.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {doublesTeams.map((team, idx) => (
                  <div key={team.id} className="p-3 bg-muted rounded-lg">
                    <div className="font-medium flex items-center justify-between">
                      <span>Team {idx + 1}</span>
                      <span className="text-xs text-muted-foreground">
                        HC: {team.team_handicap?.toFixed(1) || "0"}
                      </span>
                    </div>
                    <div className="text-sm space-y-1 mt-1">
                      <div className="flex items-center justify-between">
                        <span>{team.player1.name}</span>
                        {editingTeams && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removePlayerFromTeam(team.id, team.player1_id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{team.player2.name}</span>
                        {editingTeams && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removePlayerFromTeam(team.id, team.player2_id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              )}
              {wildMan && (
                <div className="p-3 bg-primary/20 border border-primary rounded-lg">
                  <div className="font-medium text-primary">Wild Man</div>
                  <div className="text-sm">{getPlayerName(wildMan)}</div>
                  <div className="text-xs text-muted-foreground">Added to Hole 1</div>
                </div>
              )}
            </div>
          )}
          
          {/* Show Card Assignments */}
          {cardAssignments.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Card Assignments</h4>
                {editingCards && (
                  <Button 
                    onClick={handleSaveCardEdits} 
                    size="sm" 
                    disabled={loading}
                    className="gap-1"
                  >
                    <Save className="h-4 w-4" />
                    Save Card Changes
                  </Button>
                )}
              </div>
              
              {/* Show unassigned players when editing */}
              {editingCards && getUnassignedPlayers().length > 0 && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
                  <div className="font-medium text-yellow-600 mb-2">Unassigned Players</div>
                  <div className="flex flex-wrap gap-2">
                    {getUnassignedPlayers().map(player => (
                      <Badge key={player.id} variant="outline" className="text-yellow-600 border-yellow-500">
                        {player.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {cardAssignments.map((card, cardIdx) => (
                  <div key={cardIdx} className={`p-3 rounded-lg ${card.sanctioned ? "bg-muted border-2 border-accent" : "bg-muted"}`}>
                    <div className="font-medium text-primary flex items-center justify-between">
                      <span>Hole {card.hole}</span>
                      <span className="text-xs text-muted-foreground">{card.players.length} players</span>
                    </div>
                    {card.sanctioned && (
                      <span className="inline-block mt-1 rounded px-2 py-0.5 text-[10px] font-semibold bg-accent text-accent-foreground">
                        PDGA Sanctioned
                      </span>
                    )}
                    <div className="text-sm space-y-1 mt-2">
                      {card.players.map(pid => (
                        <div key={pid} className="flex items-center justify-between">
                          <span>{getPlayerName(pid)}</span>
                          {editingCards && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => removePlayerFromCard(cardIdx, pid)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Add player dropdown when editing */}
                    {editingCards && getUnassignedPlayers().length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <Select onValueChange={(playerId) => addPlayerToCard(cardIdx, playerId)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Add player..." />
                          </SelectTrigger>
                          <SelectContent>
                            {getUnassignedPlayers().map(player => (
                              <SelectItem key={player.id} value={player.id}>
                                {player.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Phase 2: After Round - Scores & Submit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Phase 2: After Round</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Input */}
          <div className="space-y-3">
            <h4 className="font-semibold">Scores</h4>
            {currentEvent.is_doubles ? (
              // Team scores - grouped by card assignments
              cardAssignments.length > 0 ? (
                <div className="space-y-4">
                  {cardAssignments.map((card, idx) => (
                    <div key={idx} className="border rounded-lg overflow-hidden">
                      <div className="bg-primary/10 px-3 py-2 font-medium text-primary border-b">
                        Hole {card.hole}
                      </div>
                      <div className="divide-y">
                        {(card.teams || []).map((cardTeam) => {
                          const team = doublesTeams.find(t => 
                            (t.player1_id === cardTeam.player1_id && t.player2_id === cardTeam.player2_id) ||
                            (t.player1_id === cardTeam.player2_id && t.player2_id === cardTeam.player1_id)
                          )
                          if (!team) return null
                          // Calculate team handicap with non-member rule applied
                          const p1Handicap = effectiveHandicaps.get(team.player1_id) || 0
                          const p2Handicap = effectiveHandicaps.get(team.player2_id) || 0
                          const teamHandicap = calculateTeamHandicap(p1Handicap, p2Handicap)
                          return (
                            <div key={team.id} className="flex items-center gap-3 p-3">
                              <div className="flex-1">
                                <div className="font-medium">{team.player1.name} & {team.player2.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  Team HC: {teamHandicap.toFixed(1)}
                                </div>
                              </div>
                              <Input
                                type="number"
                                className="w-20"
                                placeholder="Score"
                                value={teamScores[team.id] || ""}
                                onChange={(e) => setTeamScores(prev => ({
                                  ...prev,
                                  [team.id]: e.target.value
                                }))}
                              />
                            </div>
                          )
                        })}
                        {/* Show wild man - player on card but not part of any team */}
                        {(() => {
                          const teamPlayerIds = new Set((card.teams || []).flatMap(t => [t.player1_id, t.player2_id]))
                          const wildManOnCard = card.players.find(pid => !teamPlayerIds.has(pid))
                          if (!wildManOnCard) return null
                          // Wild man uses effective handicap (with non-member rule applied)
                          const effectiveHandicap = effectiveHandicaps.get(wildManOnCard) || 0
                          const wildManDoublesHandicap = calculateWildManHandicap(effectiveHandicap)
                          return (
                            <div className="flex items-center gap-3 p-3 bg-primary/5">
                              <div className="flex-1">
                                <div className="font-medium text-primary">{getPlayerName(wildManOnCard)} (Wild Man)</div>
                                <div className="text-xs text-muted-foreground">
                                  HC: {wildManDoublesHandicap.toFixed(1)}
                                </div>
                              </div>
                              <Input
                                type="number"
                                className="w-20"
                                placeholder="Score"
                                value={scores[wildManOnCard] || ""}
                                onChange={(e) => setScores(prev => ({
                                  ...prev,
                                  [wildManOnCard]: e.target.value
                                }))}
                              />
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Fallback if no card assignments yet
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {doublesTeams.map((team, idx) => (
                    <div key={team.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">Team {idx + 1}</div>
                        <div className="text-sm text-muted-foreground">
                          {team.player1.name} & {team.player2.name}
                        </div>
                      </div>
                      <Input
                        type="number"
                        className="w-20"
                        placeholder="Score"
                        value={teamScores[team.id] || ""}
                        onChange={(e) => setTeamScores(prev => ({
                          ...prev,
                          [team.id]: e.target.value
                        }))}
                      />
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Individual scores - grouped by card assignments
              cardAssignments.length > 0 ? (
                <div className="space-y-4">
                  {cardAssignments.map((card, idx) => (
                    <div key={idx} className="border rounded-lg overflow-hidden">
                      <div className="bg-primary/10 px-3 py-2 font-medium text-primary border-b">
                        Hole {card.hole}
                      </div>
                      <div className="divide-y">
                        {card.players.map(playerId => {
                          const player = attendingPlayers.find(p => p.id === playerId)
                          if (!player) return null
                          return (
                            <div key={player.id} className="flex items-center gap-3 p-3">
                              <div className="flex-1">
                                <div className="font-medium">{player.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  HC: {(effectiveHandicaps.get(player.id) || 0).toFixed(1)}
                                </div>
                              </div>
                              <Input
                                type="number"
                                className="w-20"
                                placeholder="Score"
                                value={scores[player.id] || ""}
                                onChange={(e) => setScores(prev => ({
                                  ...prev,
                                  [player.id]: e.target.value
                                }))}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Fallback if no card assignments yet
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {attendingPlayers.map(player => (
                    <div key={player.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{player.name}</div>
                        <div className="text-xs text-muted-foreground">
                          HC: {(effectiveHandicaps.get(player.id) || 0).toFixed(1)}
                        </div>
                      </div>
                      <Input
                        type="number"
                        className="w-20"
                        placeholder="Score"
                        value={scores[player.id] || ""}
                        onChange={(e) => setScores(prev => ({
                          ...prev,
                          [player.id]: e.target.value
                        }))}
                      />
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
          
          {/* CTP Winner - Team for doubles, individual for singles */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              CTP Winner {currentEvent.is_doubles && "(Team)"}
            </Label>
            {currentEvent.is_doubles ? (
              <Select value={doublesCTPTeam} onValueChange={setDoublesCTPTeam}>
                <SelectTrigger className="w-full md:w-80">
                  <SelectValue placeholder="Select CTP winning team" />
                </SelectTrigger>
                <SelectContent>
                  {doublesTeams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.player1.name} & {team.player2.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={ctpWinner} onValueChange={setCtpWinner}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Select CTP winner" />
                </SelectTrigger>
                <SelectContent>
                  {attendingPlayers.map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          {/* Doubles Scoring Type Toggle */}
          {currentEvent.is_doubles && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Scoring Type
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={doublesScoringType === 'raw' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDoublesScoringType('raw')}
                >
                  RAW Score
                </Button>
                <Button
                  type="button"
                  variant={doublesScoringType === 'handicap' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDoublesScoringType('handicap')}
                >
                  Handicap
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {doublesScoringType === 'raw' 
                  ? "Winner determined by lowest raw team score" 
                  : "Winner determined by handicap-adjusted final score"}
              </p>
            </div>
          )}
          
          {/* Playoff Winner Selection - Only show when there's a tie */}
          {tiedPlayers.length > 1 && !currentEvent.is_doubles && (
            <div className="space-y-2 p-4 border border-amber-500/50 rounded-lg bg-amber-500/10">
              <Label className="flex items-center gap-2 text-amber-600">
                <Trophy className="h-4 w-4" />
                Playoff Required - {tiedPlayers.length} Players Tied!
              </Label>
              <p className="text-sm text-muted-foreground">
                The following players tied for first. Select the playoff winner:
              </p>
              <Select value={playoffWinner} onValueChange={setPlayoffWinner}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Select playoff winner" />
                </SelectTrigger>
                <SelectContent>
                  {tiedPlayers.map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name} (Final: {player.finalScore > 0 ? '+' : ''}{player.finalScore.toFixed(1)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {tiedTeams.length > 1 && currentEvent.is_doubles && (
            <div className="space-y-2 p-4 border border-amber-500/50 rounded-lg bg-amber-500/10">
              <Label className="flex items-center gap-2 text-amber-600">
                <Trophy className="h-4 w-4" />
                Playoff Required - {tiedTeams.length} Teams Tied!
              </Label>
              <p className="text-sm text-muted-foreground">
                The following teams tied for first. Select the playoff winner:
              </p>
              <Select value={playoffWinnerTeam} onValueChange={setPlayoffWinnerTeam}>
                <SelectTrigger className="w-full md:w-80">
                  <SelectValue placeholder="Select playoff winning team" />
                </SelectTrigger>
                <SelectContent>
                  {tiedTeams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} ({doublesScoringType === 'raw' ? 'Score' : 'Final'}: {team.score > 0 ? '+' : ''}{team.score.toFixed(1)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 sm:gap-3 pt-4 border-t">
            <Button 
              onClick={() => setShowSubmitConfirm(true)} 
              disabled={loading}
              size="sm"
              className="gap-1.5 sm:gap-2 text-xs sm:text-sm bg-accent hover:bg-accent/90"
            >
              <Send className="h-4 w-4 shrink-0" />
              Submit Event
            </Button>
          </div>
          
          {/* Submit Confirmation Dialog */}
          <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-accent" />
                  Submit Event Results
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  This will finalize all results and make them visible on the public leaderboard. 
                  The following will be published:
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  <span>{currentEvent.is_doubles ? "Team scores and standings" : "Player scores and standings"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  <span>Hot round winner{currentEvent.is_doubles ? " (team)" : ""}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  <span>CTP winner{currentEvent.is_doubles ? " (team)" : ""}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  <span>Cash leaderboard updates</span>
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleSubmitEvent}
                  disabled={loading}
                  className="bg-accent hover:bg-accent/90"
                >
                  {loading ? "Submitting..." : "Submit Results"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
