"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Crown, Target, Swords, Trophy, Sparkles } from "lucide-react"
import {
  CardAssignment,
  DoublesTeamWithPlayers,
  FinaleCtp,
  FinaleTiebreaks,
  Player,
  WeekWithDetails,
  calculateTeamHandicap,
  calculateWildManHandicap,
} from "@/lib/types"
import {
  DOUBLES_FINALE,
  SINGLES_FINALE,
  computeDoublesFinale,
  computeSinglesFinale,
  doublesEntrantId,
  type FinaleCtpSpec,
  type FinalePrize,
} from "@/lib/finale"
import { saveFinaleCtp, saveFinaleTiebreaks } from "@/app/actions/finale"

interface FinaleAdminPanelProps {
  event: WeekWithDetails
  players: Player[]
  cardAssignments: CardAssignment[]
  doublesTeams: DoublesTeamWithPlayers[]
  /** Unsaved score inputs from the event manager (live preview). */
  scores: Record<string, string>
  teamScores: Record<string, string>
  effectiveHandicaps: Map<string, number>
  doublesScoringType: "raw" | "handicap"
  initialCtps: FinaleCtp[]
}

interface CtpOption {
  value: string
  label: string
  playerIds: string[]
}

const NONE = "__none__"

function money(n: number) {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`
}

export function FinaleAdminPanel({
  event,
  players,
  cardAssignments,
  doublesTeams,
  scores,
  teamScores,
  effectiveHandicaps,
  doublesScoringType,
  initialCtps,
}: FinaleAdminPanelProps) {
  const router = useRouter()
  const [ctps, setCtps] = useState<FinaleCtp[]>(initialCtps)
  const [tiebreaks, setTiebreaks] = useState<FinaleTiebreaks>(event.finale_tiebreaks || {})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const nameOf = (id: string) => players.find(p => p.id === id)?.name || "Unknown"
  const isDoubles = event.is_doubles
  const specs: FinaleCtpSpec[] = isDoubles ? DOUBLES_FINALE.ctps : SINGLES_FINALE.ctps

  // Who can win a CTP: doubles = a team (or Wild Man), singles = a card.
  const options: CtpOption[] = useMemo(() => {
    if (isDoubles) {
      const teamed = new Set(doublesTeams.flatMap(t => [t.player1_id, t.player2_id]))
      const wildMen = event.attendance.map(a => a.player_id).filter(id => !teamed.has(id))
      return [
        ...doublesTeams.map(t => ({
          value: doublesEntrantId([t.player1_id, t.player2_id]),
          label: t.player1_id === t.player2_id ? t.player1.name : `${t.player1.name} & ${t.player2.name}`,
          playerIds: [...new Set([t.player1_id, t.player2_id])],
        })),
        ...wildMen.map(id => ({ value: id, label: `${nameOf(id)} (Wild Man)`, playerIds: [id] })),
      ]
    }
    return cardAssignments
      .filter(c => c.players.length > 0)
      .map(c => ({
        value: doublesEntrantId(c.players),
        label: `Hole ${c.hole} card: ${c.players.map(nameOf).join(", ")}`,
        playerIds: c.players,
      }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDoubles, doublesTeams, cardAssignments, event.attendance, players])

  // Live payout preview from the scores currently typed in (saved or not).
  const result = useMemo(() => {
    if (isDoubles) {
      const teamed = new Set(doublesTeams.flatMap(t => [t.player1_id, t.player2_id]))
      const entrants = [
        ...doublesTeams.map(t => ({
          id: doublesEntrantId([t.player1_id, t.player2_id]),
          name: t.player1_id === t.player2_id ? t.player1.name : `${t.player1.name} & ${t.player2.name}`,
          playerIds: [t.player1_id, t.player2_id],
          raw: teamScores[t.id] ? parseInt(teamScores[t.id]) : null,
          teamHandicap:
            t.team_handicap !== null && t.team_handicap !== undefined
              ? Number(t.team_handicap)
              : calculateTeamHandicap(effectiveHandicaps.get(t.player1_id) || 0, effectiveHandicaps.get(t.player2_id) || 0),
        })),
        ...event.attendance
          .filter(a => !teamed.has(a.player_id) && scores[a.player_id])
          .map(a => ({
            id: a.player_id,
            name: `${a.player.name} (Wild Man)`,
            playerIds: [a.player_id],
            raw: parseInt(scores[a.player_id]),
            teamHandicap: calculateWildManHandicap(effectiveHandicaps.get(a.player_id) || 0),
          })),
      ]
      return computeDoublesFinale(entrants, doublesScoringType, tiebreaks, ctps, false)
    }
    const entrants = event.attendance.map(a => ({
      id: a.player_id,
      name: a.player.name,
      raw: scores[a.player_id] ? parseInt(scores[a.player_id]) : null,
      handicap: effectiveHandicaps.get(a.player_id) || 0,
    }))
    return computeSinglesFinale(entrants, tiebreaks, ctps, false)
  }, [isDoubles, doublesTeams, teamScores, scores, event.attendance, effectiveHandicaps, doublesScoringType, tiebreaks, ctps])

  const handleCtpChange = async (spec: FinaleCtpSpec, value: string) => {
    const option = options.find(o => o.value === value)
    const playerIds = option?.playerIds ?? []
    const label = option ? option.label.replace(/^Hole \d+ card: /, "") : null
    setSavingKey(spec.key)
    setError(null)
    try {
      const res = await saveFinaleCtp(event.id, spec.key, playerIds, label)
      if (!res.success) {
        setError(res.error ?? "Failed to save CTP")
        return
      }
      setCtps(prev => {
        const rest = prev.filter(c => c.ctp_key !== spec.key)
        if (playerIds.length === 0) return rest
        return [
          ...rest,
          {
            id: spec.key,
            week_id: event.id,
            ctp_key: spec.key,
            winner_player_ids: playerIds,
            winner_label: label,
            created_at: new Date().toISOString(),
          },
        ]
      })
      router.refresh()
    } finally {
      setSavingKey(null)
    }
  }

  const ctpValue = (spec: FinaleCtpSpec) => {
    const row = ctps.find(c => c.ctp_key === spec.key)
    return row ? doublesEntrantId(row.winner_player_ids) : NONE
  }

  // Wild Man CTP rows are keyed by player id, not the joined key.
  const optionValueFor = (spec: FinaleCtpSpec) => {
    const v = ctpValue(spec)
    if (v === NONE) return NONE
    return options.find(o => doublesEntrantId(o.playerIds) === v)?.value ?? NONE
  }

  const setPlayoffFinish = (key: "places" | "lowRaw", id: string, finish: number) => {
    setTiebreaks(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [id]: finish } }))
  }

  const savePlayoffs = async () => {
    setSavingKey("playoffs")
    setError(null)
    try {
      const res = await saveFinaleTiebreaks(event.id, tiebreaks)
      if (!res.success) setError(res.error ?? "Failed to save playoff results")
      else router.refresh()
    } finally {
      setSavingKey(null)
    }
  }

  const groups: FinalePrize["group"][] = ["Places", "Low Raw", "Handicap", "CTP"]

  return (
    <Card className="border-gold/50 bg-gradient-to-br from-gold/10 via-transparent to-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gold">
          <Crown className="h-5 w-5" />
          Season Finale Payouts
          <Badge variant="outline" className="ml-auto border-gold/50 text-gold">
            {money(result.pool)} pool
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Payouts calculate automatically from the scores above. Hit <strong>Save Scores</strong> to push them live to
          the Finale page.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* CTP winners */}
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-semibold">
            <Target className="h-4 w-4 text-accent" />
            CTP Winners {isDoubles ? "(team)" : "(card)"}
          </h4>
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isDoubles ? "Save teams and cards first." : "Save cards first. Singles CTPs are won by a card."}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {specs.map(spec => (
                <div key={spec.key} className="flex items-center gap-2 rounded-lg border bg-background/60 p-2">
                  <div className="w-28 shrink-0">
                    <div className="text-sm font-medium">{spec.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {spec.course ?? (spec.kind === "throwoff" ? "Throw-off" : "Team CTP")} · {money(spec.amount)}
                    </div>
                  </div>
                  <Select
                    value={optionValueFor(spec)}
                    onValueChange={v => handleCtpChange(spec, v === NONE ? "" : v)}
                    disabled={savingKey === spec.key}
                  >
                    <SelectTrigger className="h-9 min-w-0 flex-1">
                      <SelectValue placeholder="No winner yet" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No winner yet</SelectItem>
                      {options.map(o => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Playoffs */}
        {result.playoffs.length > 0 && (
          <div className="space-y-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
            <h4 className="flex items-center gap-2 font-semibold text-amber-500">
              <Swords className="h-4 w-4" />
              Playoff needed
            </h4>
            {result.playoffs.map(p => (
              <div key={`${p.key}-${p.fromPosition}`} className="space-y-2">
                <Label className="text-sm">
                  {p.key === "lowRaw" ? "Low Raw" : isDoubles ? "Team places" : "Places"}: tied for{" "}
                  {p.fromPosition === p.toPosition ? `#${p.fromPosition}` : `#${p.fromPosition}–${p.toPosition}`}
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {p.ids.map((id, i) => (
                    <div key={id} className="flex items-center gap-2 rounded border bg-background/60 p-2">
                      <span className="flex-1 truncate text-sm">{p.names[i]}</span>
                      <Select
                        value={String(tiebreaks[p.key]?.[id] ?? "")}
                        onValueChange={v => setPlayoffFinish(p.key, id, parseInt(v))}
                      >
                        <SelectTrigger className="h-8 w-28">
                          <SelectValue placeholder="Finish" />
                        </SelectTrigger>
                        <SelectContent>
                          {p.ids.map((_, k) => (
                            <SelectItem key={k} value={String(k + 1)}>
                              Playoff #{k + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Button size="sm" onClick={savePlayoffs} disabled={savingKey === "playoffs"} className="gap-2">
              <Trophy className="h-4 w-4" />
              {savingKey === "playoffs" ? "Saving..." : "Save Playoff Results"}
            </Button>
          </div>
        )}

        {/* Live payout preview */}
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4 text-gold" />
            Payout Preview
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            {groups.map(group => {
              const prizes = result.prizes.filter(p => p.group === group)
              if (prizes.length === 0) return null
              return (
                <div key={group} className="rounded-lg border bg-background/60 p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</div>
                  <div className="space-y-1">
                    {prizes.map(p => (
                      <div key={p.key} className="flex items-center justify-between gap-2 text-sm">
                        <span className="w-28 shrink-0 text-muted-foreground">{p.label}</span>
                        <span
                          className={`min-w-0 flex-1 truncate ${
                            p.status === "playoff" ? "text-amber-500" : p.winners.length ? "font-medium" : "text-muted-foreground"
                          }`}
                        >
                          {p.winners.length ? p.winners.join(", ") : "—"}
                          {p.status === "playoff" && " (playoff)"}
                        </span>
                        <span className="shrink-0 font-semibold text-money">{p.amount === null ? "on hand" : money(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
