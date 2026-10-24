import { Calendar, Clock, Crown, MapPin, Medal, Swords, Target, Trophy, Users2, Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/utils"
import type { FinaleEventData } from "@/lib/data"
import type { FinaleCtpSpec, FinalePrize, FinaleStanding } from "@/lib/finale"

export function money(n: number) {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`
}

function toPar(n: number) {
  const r = Math.round(n * 10) / 10
  if (r === 0) return "E"
  return `${r > 0 ? "+" : ""}${Number.isInteger(r) ? r : r.toFixed(1)}`
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// ---------------------------------------------------------------------------

export function DiscIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <radialGradient id="disc-face" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="oklch(0.95 0.08 90)" />
          <stop offset="55%" stopColor="oklch(0.82 0.165 85)" />
          <stop offset="100%" stopColor="oklch(0.6 0.14 70)" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="32" rx="30" ry="30" fill="url(#disc-face)" />
      <ellipse cx="32" cy="32" rx="22" ry="22" fill="none" stroke="oklch(0.55 0.12 70 / 0.6)" strokeWidth="1.5" />
      <ellipse cx="32" cy="32" rx="12" ry="12" fill="none" stroke="oklch(0.55 0.12 70 / 0.4)" strokeWidth="1" />
      <path d="M 14 22 Q 32 10 50 22" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function StatusPill({ data }: { data: FinaleEventData }) {
  if (data.isFinal) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/50 bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
        <Trophy className="h-3.5 w-3.5" /> Final
      </span>
    )
  }
  if (data.isLive) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-red-500/50 bg-red-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-300">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        Live
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
      <Clock className="h-3.5 w-3.5" /> Upcoming
    </span>
  )
}

// ---------------------------------------------------------------------------
// Prize board

const statusStyles: Record<FinalePrize["status"], string> = {
  won: "border-gold/60 bg-gradient-to-br from-gold/20 via-gold/5 to-transparent finale-won",
  leading: "border-primary/50 bg-primary/10",
  playoff: "border-amber-500/60 bg-amber-500/10",
  open: "border-dashed border-white/15 bg-white/[0.02]",
}

function PrizeTile({ prize, big = false }: { prize: FinalePrize; big?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl border p-3 sm:p-4 transition-colors", statusStyles[prize.status])}>
      <div className="flex items-start justify-between gap-2">
        <div className={cn("font-semibold text-white/70", big ? "text-sm" : "text-xs")}>{prize.label}</div>
        <div className={cn("font-black text-money tabular-nums", big ? "text-2xl sm:text-3xl" : "text-lg")}>
          {prize.amount === null ? "?" : money(prize.amount)}
        </div>
      </div>
      <div className={cn("mt-2 truncate font-bold", big ? "text-lg" : "text-sm", prize.winners.length === 0 && "text-white/35")}>
        {prize.winners.length ? prize.winners.join(" · ") : "Up for grabs"}
      </div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wider">
        {prize.status === "won" && <span className="text-gold">Winner</span>}
        {prize.status === "leading" && <span className="text-primary">Leading</span>}
        {prize.status === "playoff" && (
          <span className="inline-flex items-center gap-1 text-amber-400">
            <Swords className="h-3 w-3" /> Playoff
          </span>
        )}
        {prize.status === "open" && <span className="text-white/30">Open</span>}
        {prize.note && prize.status !== "playoff" && <span className="ml-2 normal-case tracking-normal text-white/45">{prize.note}</span>}
      </div>
    </div>
  )
}

export function PrizeBoard({ prizes }: { prizes: FinalePrize[] }) {
  const places = prizes.filter(p => p.group === "Places")
  const lowRaw = prizes.filter(p => p.group === "Low Raw")
  const handicap = prizes.filter(p => p.group === "Handicap")
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {places.slice(0, 3).map(p => (
          <PrizeTile key={p.key} prize={p} big />
        ))}
      </div>
      {places.length > 3 && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          {places.slice(3).map(p => (
            <PrizeTile key={p.key} prize={p} />
          ))}
        </div>
      )}
      {(lowRaw.length > 0 || handicap.length > 0) && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[...lowRaw, ...handicap].map(p => (
            <PrizeTile key={p.key} prize={p} />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Leaderboard

export function Leaderboard({
  standings,
  paidPlaces,
  mode,
  emptyText,
}: {
  standings: FinaleStanding[]
  paidPlaces: number
  mode: "singles" | "doubles-handicap" | "doubles-raw" | "low-raw"
  emptyText: string
}) {
  if (standings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/50">
        {emptyText}
      </div>
    )
  }
  const medal = (pos: number) =>
    pos === 1 ? "text-gold" : pos === 2 ? "text-silver" : pos === 3 ? "text-bronze" : "text-white/40"

  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <div className="grid grid-cols-[3rem_1fr_auto_auto] gap-2 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/50 sm:grid-cols-[3.5rem_1fr_4rem_4rem_5rem]">
        <span>Pos</span>
        <span>{mode.startsWith("doubles") ? "Team" : "Player"}</span>
        <span className="hidden text-right sm:block">{mode === "low-raw" ? "" : "HC"}</span>
        <span className="text-right">{mode === "low-raw" || mode === "doubles-raw" ? "Raw" : "Score"}</span>
        <span className="text-right">Prize</span>
      </div>
      <div className="divide-y divide-white/5">
        {standings.map((s, i) => {
          const inMoney = s.position <= paidPlaces
          const showCut = i > 0 && standings[i - 1].position <= paidPlaces && !inMoney
          return (
            <div key={s.id}>
              {showCut && (
                <div className="flex items-center gap-2 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-money/70">
                  <span className="h-px flex-1 bg-money/30" /> money line <span className="h-px flex-1 bg-money/30" />
                </div>
              )}
              <div
                className={cn(
                  "grid grid-cols-[3rem_1fr_auto_auto] items-center gap-2 px-3 py-2.5 sm:grid-cols-[3.5rem_1fr_4rem_4rem_5rem]",
                  inMoney && "bg-gradient-to-r from-gold/10 to-transparent",
                  s.position === 1 && "from-gold/20"
                )}
              >
                <span className={cn("flex items-center gap-1 font-black tabular-nums", medal(s.position))}>
                  {s.position <= 3 ? <Medal className="h-4 w-4" /> : null}
                  {s.tied && s.payout === null ? "T" : ""}
                  {s.position}
                </span>
                <span className="min-w-0 truncate font-semibold">{s.name}</span>
                <span className="hidden text-right text-sm tabular-nums text-white/50 sm:block">
                  {mode === "low-raw" ? "" : toPar(s.handicap)}
                </span>
                <span className="text-right font-bold tabular-nums">
                  {mode === "low-raw" || mode === "doubles-raw" ? s.raw : toPar(s.score)}
                  {mode !== "low-raw" && mode !== "doubles-raw" && (
                    <span className="ml-1 text-xs font-normal text-white/40">({s.raw})</span>
                  )}
                </span>
                <span className="text-right text-sm font-bold tabular-nums">
                  {s.payout === null ? (
                    <span className="inline-flex items-center gap-1 text-amber-400">
                      <Swords className="h-3 w-3" /> Playoff
                    </span>
                  ) : s.payout > 0 ? (
                    <span className="rounded-full bg-money/15 px-2 py-0.5 text-money">{money(s.payout)}</span>
                  ) : (
                    <span className="text-white/25">—</span>
                  )}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CTP hole map

export function CtpMap({ specs, prizes, perPlayerNote }: { specs: FinaleCtpSpec[]; prizes: FinalePrize[]; perPlayerNote: string }) {
  const won = prizes.filter(p => p.group === "CTP" && p.status === "won").length
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-white/60">{perPlayerNote}</span>
        <span className="font-semibold text-accent">
          {won}/{specs.length} claimed
        </span>
      </div>
      <div className={cn("grid gap-2", specs.length > 6 ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-2 sm:grid-cols-4")}>
        {specs.map(spec => {
          const prize = prizes.find(p => p.key === `ctp:${spec.key}`)
          const isWon = prize?.status === "won"
          const courseTint =
            spec.course === "Akron"
              ? "from-primary/25"
              : spec.course === "Rochester"
                ? "from-accent/20"
                : spec.kind === "throwoff"
                  ? "from-fuchsia-500/20"
                  : "from-gold/15"
          return (
            <div
              key={spec.key}
              className={cn(
                "relative flex min-h-24 flex-col justify-between overflow-hidden rounded-xl border bg-gradient-to-br to-transparent p-2.5",
                courseTint,
                isWon ? "border-gold/60 finale-won" : "border-white/10"
              )}
            >
              <div className="flex items-start justify-between gap-1">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                    {spec.course ?? (spec.kind === "throwoff" ? "Throw-off" : "Team CTP")}
                  </div>
                  <div className="text-lg font-black leading-tight">
                    {spec.hole ? spec.hole : spec.label.replace("Throw-off ", "")}
                  </div>
                </div>
                <Target className={cn("h-4 w-4 shrink-0", isWon ? "text-gold" : "text-white/25")} />
              </div>
              <div className={cn("line-clamp-2 text-xs font-semibold leading-snug", isWon ? "text-white" : "text-white/30")}>
                {isWon ? prize?.winners.join(", ") : money(spec.amount)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Event header

export function EventHeader({
  id,
  eyebrow,
  title,
  date,
  timeLabel,
  location,
  pool,
  data,
  icon,
}: {
  id: string
  eyebrow: string
  title: string
  date: string
  timeLabel: string
  location: string
  pool: number
  data: FinaleEventData
  icon: "doubles" | "singles"
}) {
  const Icon = icon === "doubles" ? Users2 : Crown
  return (
    <div id={id} className="scroll-mt-24 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-gold">{eyebrow}</span>
          <StatusPill data={data} />
        </div>
        <h2 className="mt-2 flex items-center gap-3 text-3xl font-black tracking-tight sm:text-4xl">
          <Icon className="h-8 w-8 text-gold" />
          {title}
        </h2>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/60">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {formatDate(date, "EEEE, MMM d")}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {timeLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {data.week?.course_name || location}
          </span>
          {data.week && (
            <span className="flex items-center gap-1.5">
              <Flame className="h-4 w-4" />
              {data.week.attendance.length} in the field
            </span>
          )}
        </div>
      </div>
      <div className="finale-glass rounded-2xl px-5 py-3 text-right">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">Purse</div>
        <div className="text-3xl font-black text-money tabular-nums">{money(pool)}</div>
        {data.result.awarded > 0 && (
          <div className="text-xs text-white/50">{money(data.result.awarded)} awarded</div>
        )}
      </div>
    </div>
  )
}

export { ordinal }
