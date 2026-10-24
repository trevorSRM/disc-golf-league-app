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
