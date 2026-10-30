"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  }
}

/** Big flip-style countdown. Renders `liveLabel` once the target passes. */
export function Countdown({
  target,
  liveLabel = "LIVE NOW",
  compact = false,
}: {
  target: string
  liveLabel?: string
  compact?: boolean
}) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const targetMs = new Date(target).getTime()
  // Server render / first paint: stable placeholder so hydration matches.
  if (now === null) {
    return <div className={compact ? "h-8" : "h-20"} aria-hidden />
  }
  if (now >= targetMs) {
    return (
      <div className="inline-flex items-center gap-2 font-black tracking-widest text-red-400">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
        </span>
        {liveLabel}
      </div>
    )
  }

  const p = parts(targetMs - now)
  const units = [
    { label: "Days", value: p.days },
    { label: "Hrs", value: p.hours },
    { label: "Min", value: p.minutes },
    { label: "Sec", value: p.seconds },
  ]

  if (compact) {
    return (
      <div className="flex items-baseline gap-1.5 font-mono text-lg font-bold tabular-nums">
        {units.map((u, i) => (
          <span key={u.label} className="flex items-baseline gap-0.5">
            <span>{String(u.value).padStart(2, "0")}</span>
            <span className="text-[10px] font-sans font-medium uppercase text-white/60">{u.label[0]}</span>
            {i < units.length - 1 && <span className="ml-1 text-white/30">:</span>}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {units.map(u => (
        <div
          key={u.label}
          className="finale-glass w-16 rounded-xl px-2 py-3 text-center sm:w-20 sm:py-4"
        >
          <div className="font-mono text-2xl font-black tabular-nums sm:text-4xl">
            {String(u.value).padStart(2, "0")}
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">{u.label}</div>
        </div>
      ))}
    </div>
  )
}

/** Counts up to `value` once on mount. */
export function CountUp({ value, prefix = "$", duration = 1600 }: { value: number; prefix?: string; duration?: number }) {
  const [shown, setShown] = useState(value)

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (reduce) return
    let frame = 0
    const start = performance.now()
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - k, 3)
      setShown(Math.round(value * eased))
      if (k < 1) frame = requestAnimationFrame(tick)
    }
    setShown(0)
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return (
    <span className="tabular-nums">
      {prefix}
      {shown.toLocaleString()}
    </span>
  )
}

/** Re-fetches the page on an interval while an event is live. */
export function LiveRefresh({ active, seconds = 20 }: { active: boolean; seconds?: number }) {
  const router = useRouter()
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => router.refresh(), seconds * 1000)
    return () => clearInterval(t)
  }, [active, seconds, router])

  if (!active) return null
  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-red-500/40 bg-background/90 px-3 py-1.5 text-xs font-semibold text-red-300 shadow-lg backdrop-blur">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
      </span>
      Live scoring · updates every {seconds}s
    </div>
  )
}

/** "Am I eligible?" — searchable list of members with a locked handicap. */
export function EligibleChecker({ players }: { players: { id: string; name: string; handicap: number }[] }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name))
  const q = query.trim().toLowerCase()
  const matches = q ? sorted.filter(p => p.name.toLowerCase().includes(q)) : sorted
  const fmt = (h: number) => (h === 0 ? "E" : `${h > 0 ? "+" : ""}${h.toFixed(1)}`)

  return (
    <div className="container mx-auto px-4 pb-5">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm font-bold text-gold transition hover:bg-gold/15 sm:w-auto"
      >
        {open ? "Hide eligible players" : `Am I eligible? See all ${players.length} eligible players`}
      </button>
      {open && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type your name…"
            className="w-full rounded-lg border border-white/15 bg-background px-3 py-2 text-sm outline-none focus:border-gold/60 sm:max-w-sm"
            autoFocus
          />
          {q && (
            <p className={`mt-3 text-sm font-semibold ${matches.length ? "text-accent" : "text-amber-300"}`}>
              {matches.length
                ? "You're in! See you at the finale."
                : "Not on the list. The finale is for members with at least one regular-season round. Talk to Trevor if that looks wrong."}
            </p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3 lg:grid-cols-4">
            {matches.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-2 border-b border-white/5 py-1.5">
                <span className="truncate">{p.name}</span>
                <span className="shrink-0 tabular-nums text-xs text-white/45">HC {fmt(p.handicap)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-white/40">Handicaps shown are locked for the finale.</p>
        </div>
      )}
    </div>
  )
}
