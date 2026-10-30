import Link from "next/link"
import { ArrowRight, Crown } from "lucide-react"
import { DOUBLES_FINALE, FINALE_POOL, SINGLES_FINALE } from "@/lib/finale"
import { Countdown } from "@/components/finale/finale-client"
import { DiscIcon } from "@/components/finale/finale-sections"

// Homepage call-out for the Season Finale. Shown through the end of November.
const SHOW_UNTIL = new Date("2026-12-01T00:00:00-05:00").getTime()

export function FinaleBanner({
  live,
  doublesFinal,
  singlesFinal,
}: {
  live: boolean
  doublesFinal: boolean
  singlesFinal: boolean
}) {
  if (Date.now() > SHOW_UNTIL) return null

  const resultsIn = doublesFinal && singlesFinal
  const target = !doublesFinal ? DOUBLES_FINALE.startsAt : SINGLES_FINALE.startsAt

  let status: React.ReactNode
  if (resultsIn) {
    status = <span className="font-bold text-gold">Results are in</span>
  } else if (live) {
    status = (
      <span className="inline-flex items-center gap-2 font-black tracking-widest text-red-300">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        LIVE SCORING
      </span>
    )
  } else if (target) {
    status = <Countdown target={target} compact liveLabel="LIVE NOW" />
  } else {
    status = <span className="font-semibold text-white/80">Sat, Nov 7 · time TBD</span>
  }

  return (
    <Link href="/finale" className="group block" aria-label="Go to the Season Finale page">
      <div className="finale-border rounded-2xl p-[2px]">
        <div className="finale-sweep relative overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_left,oklch(0.32_0.08_85/0.55),transparent_55%),radial-gradient(ellipse_at_right,oklch(0.3_0.12_250/0.7),transparent_60%)] bg-background px-4 py-5 sm:px-6">
          <div className="finale-grid-bg absolute inset-0 opacity-60" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-gold/40 blur-xl" />
                <DiscIcon className="relative h-14 w-14 transition-transform duration-700 group-hover:rotate-[360deg] sm:h-16 sm:w-16" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-gold">
                  <Crown className="h-3.5 w-3.5" /> Nov 5 &amp; 7
                </div>
                <div className="text-2xl font-black uppercase leading-none tracking-tight sm:text-3xl">
                  <span className="finale-gold-text">Season Finale</span>
                </div>
                <div className="mt-1 text-sm text-white/70">
                  <span className="font-bold text-money">${FINALE_POOL}</span> in prizes · free entry · members only
                </div>
                <div className="text-xs text-white/45">Prize money locked in</div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 sm:ml-auto">
              <div className="text-white">{status}</div>
              <span className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-bold text-black shadow-[0_0_24px_-4px_oklch(0.82_0.165_85/0.8)] transition group-hover:gap-3">
                {resultsIn ? "See results" : "Enter"} <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
