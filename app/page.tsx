import Link from "next/link"
import { Crown, Medal, Trophy, Users2 } from "lucide-react"
import { getFinaleData } from "@/lib/data"
import { DOUBLES_FINALE, DOUBLES_POOL, SINGLES_FINALE, SINGLES_POOL, type FinaleStanding } from "@/lib/finale"
import { LiveRefresh } from "@/components/finale/finale-client"
import { CtpMap, DiscIcon, EventHeader, Leaderboard, PrizeBoard } from "@/components/finale/finale-sections"
import type { FinaleEventData } from "@/lib/data"

export const dynamic = "force-dynamic"

// Off-season home page: the 2026 Season Finale results.
export default async function HomePage() {
  const { doubles, singles } = await getFinaleData()

  return (
    <div className="relative overflow-hidden">
      <LiveRefresh active={doubles.isLive || singles.isLive} />

      {/* ------------------------------------------------------------ HERO */}
      <section className="relative isolate border-b border-white/10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.3_0.08_250),transparent_65%)]" />
        <div className="absolute -left-40 top-10 -z-10 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />
        <div className="absolute -right-32 top-40 -z-10 h-[28rem] w-[28rem] rounded-full bg-primary/25 blur-3xl" />
        <div className="finale-grid-bg absolute inset-0 -z-10" />

        <div className="container mx-auto px-4 pb-14 pt-12 text-center sm:pb-20 sm:pt-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.3em] text-gold">
            <Crown className="h-3.5 w-3.5" /> FCDGL 2026 · Season complete
          </div>
          <h1 className="mt-6 text-5xl font-black uppercase leading-[0.9] tracking-tight sm:text-7xl md:text-8xl">
            <span className="finale-gold-text">Season Finale</span>
            <br />
            <span className="text-white">Results</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-white/70 sm:text-lg">
            Thanks for an incredible season. See you in 2027!
          </p>

          <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
            <Champion label="Singles Champion" icon={<Crown className="h-4 w-4" />} href="#singles" data={singles} />
            <Champion label="Doubles Champions" icon={<Users2 className="h-4 w-4" />} href="#doubles" data={doubles} />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ SINGLES */}
      <section className="container mx-auto space-y-8 px-4 py-14">
        <EventHeader
          id="singles"
          eyebrow="Singles"
          title={SINGLES_FINALE.title}
          date={SINGLES_FINALE.date}
          timeLabel={SINGLES_FINALE.timeLabel}
          location={SINGLES_FINALE.location}
          pool={SINGLES_POOL}
          data={singles}
          icon="singles"
        />
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <SectionLabel>Final Standings · 2 rounds with handicap</SectionLabel>
            <Leaderboard
              standings={singles.result.standings}
              paidPlaces={SINGLES_FINALE.places.length}
              mode="singles"
              emptyText="Scores will appear here as cards come in."
            />
          </div>
          <div className="space-y-4 lg:col-span-2">
            <SectionLabel>Low Raw</SectionLabel>
            <Leaderboard
              standings={(singles.result.lowRaw || []).slice(0, 8)}
              paidPlaces={SINGLES_FINALE.lowRaw.length}
              mode="low-raw"
              emptyText="Best raw score over both rounds, no handicap."
            />
          </div>
        </div>
        <div className="space-y-4">
          <SectionLabel>Payouts</SectionLabel>
          <PrizeBoard prizes={singles.result.prizes} />
        </div>
        <div className="space-y-4">
          <SectionLabel>Closest to the Pin</SectionLabel>
          <CtpMap
            specs={SINGLES_FINALE.ctps}
            prizes={singles.result.prizes}
            perPlayerNote="Odd holes at Akron, even holes at Rochester. $10 per hole."
          />
        </div>
      </section>

      <div className="container mx-auto px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      </div>

      {/* ------------------------------------------------------------ DOUBLES */}
      <section className="container mx-auto space-y-8 px-4 py-14">
        <EventHeader
          id="doubles"
          eyebrow="Doubles"
          title={DOUBLES_FINALE.title}
          date={DOUBLES_FINALE.date}
          timeLabel={DOUBLES_FINALE.timeLabel}
          location={DOUBLES_FINALE.location}
          pool={DOUBLES_POOL}
          data={doubles}
          icon="doubles"
        />
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <SectionLabel>Final Standings</SectionLabel>
            <Leaderboard
              standings={doubles.result.standings}
              paidPlaces={DOUBLES_FINALE.places.length}
              mode={doubles.week?.doubles_scoring_type === "raw" ? "doubles-raw" : "doubles-handicap"}
              emptyText="No results."
            />
          </div>
          <div className="space-y-4 lg:col-span-2">
            <SectionLabel>Payouts</SectionLabel>
            <PrizeBoard prizes={doubles.result.prizes} />
            <p className="text-xs text-white/45">Team prizes are split between partners.</p>
          </div>
        </div>
        <div className="space-y-4">
          <SectionLabel>Closest to the Pin</SectionLabel>
          <CtpMap specs={DOUBLES_FINALE.ctps} prizes={doubles.result.prizes} perPlayerNote="$40 per team." />
        </div>
      </section>

      {/* ------------------------------------------------------------ SEE YOU */}
      <section className="border-t border-white/10 bg-black/20">
        <div className="container mx-auto flex flex-col items-center gap-3 px-4 py-14 text-center">
          <DiscIcon className="h-12 w-12" />
          <div className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
            See you in <span className="finale-gold-text">2027</span>
          </div>
          <p className="max-w-md text-sm text-white/60">
            That&apos;s a wrap on the 2026 season. Thanks to everyone who came out and threw with us.
          </p>
          <Link href="/players" className="text-sm font-semibold text-primary hover:underline">
            2026 player stats
          </Link>
        </div>
      </section>
    </div>
  )
}

function Champion({
  label,
  icon,
  href,
  data,
}: {
  label: string
  icon: React.ReactNode
  href: string
  data: FinaleEventData
}) {
  const leaders: FinaleStanding[] = data.result.standings.filter(s => s.position === 1)
  const playoff = leaders.length > 1 && leaders.some(s => s.payout === null)
  const names =
    leaders.length === 0
      ? data.isLive ? "In progress" : "TBD"
      : leaders.map(s => s.name).join(" / ")
  const tag = !data.isFinal && leaders.length > 0 ? "Leading" : playoff ? "Playoff" : null

  return (
    <a href={href} className="finale-glass group rounded-2xl p-5 text-left transition hover:-translate-y-0.5 hover:border-gold/40">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gold">
          {icon} {label}
        </span>
        {data.isFinal ? <Trophy className="h-5 w-5 text-gold" /> : <Medal className="h-5 w-5 text-white/40" />}
      </div>
      <div className="mt-3 text-2xl font-black leading-tight">{names}</div>
      {tag && <div className="mt-1 text-xs font-semibold uppercase tracking-widest text-amber-300">{tag}</div>}
    </a>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-white/60">
      {children}
      <span className="h-px flex-1 bg-white/10" />
    </h3>
  )
}
