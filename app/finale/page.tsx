import type { Metadata } from "next"
import Link from "next/link"
import { ArrowDown, CalendarDays, Crown, Disc, ExternalLink, Handshake, Lock, Map as MapIcon, ShieldCheck, Swords, Ticket, Users2 } from "lucide-react"
import { getFinaleData, getFinances } from "@/lib/data"
import {
  DOUBLES_FINALE,
  DOUBLES_POOL,
  FINALE_POOL,
  SINGLES_FINALE,
  SINGLES_POOL,
} from "@/lib/finale"
import { Countdown, CountUp, LiveRefresh } from "@/components/finale/finale-client"
import { CtpMap, DiscIcon, EventHeader, Leaderboard, PrizeBoard, money } from "@/components/finale/finale-sections"
import { formatDate } from "@/lib/utils"

export const dynamic = "force-dynamic"

// UDisc caddie book for the doubles finale's 9-hole safari layout.
const DOUBLES_LAYOUT_URL = "https://udisc.com/courses/cutshall-park-disc-golf-course-1SNs/layouts/171862/caddie-book"

export const metadata: Metadata = {
  title: "Season Finale 2026 | FCDGL",
  description: `Two nights. $${FINALE_POOL} in prizes. Members only.`,
}

export default async function FinalePage() {
  const [finale, finances] = await Promise.all([getFinaleData(), getFinances()])
  const { doubles, singles, eligible } = finale
  const anyLive = doubles.isLive || singles.isLive
  const acePool = Number(finances?.ace_pool || 0)

  // Countdown: next event that hasn't started.
  const now = Date.now()
  const next =
    !doubles.isFinal && DOUBLES_FINALE.startsAt && new Date(DOUBLES_FINALE.startsAt).getTime() > now - 6 * 3600_000
      ? { label: "Doubles tees off in", target: DOUBLES_FINALE.startsAt }
      : !singles.isFinal && SINGLES_FINALE.startsAt
        ? { label: "Singles tees off in", target: SINGLES_FINALE.startsAt }
        : null

  return (
    <div className="relative overflow-hidden">
      <LiveRefresh active={anyLive} />

      {/* ------------------------------------------------------------ HERO */}
      <section className="relative isolate border-b border-white/10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.3_0.08_250),transparent_65%)]" />
        <div className="absolute -left-40 top-10 -z-10 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />
        <div className="absolute -right-32 top-40 -z-10 h-[28rem] w-[28rem] rounded-full bg-primary/25 blur-3xl" />
        <div className="finale-grid-bg absolute inset-0 -z-10" />

        {/* Flying disc */}
        <svg className="pointer-events-none absolute inset-0 -z-10 h-full w-full" viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden>
          <path d="M -80 260 C 220 -40, 620 -40, 1100 200" fill="none" stroke="oklch(0.82 0.165 85 / 0.12)" strokeWidth="1.5" strokeDasharray="4 10" />
        </svg>
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[400px] w-full max-w-[1000px] -translate-x-1/2" aria-hidden>
          <div className="finale-disc absolute h-10 w-10">
            <DiscIcon className="h-10 w-10 drop-shadow-[0_0_12px_oklch(0.82_0.165_85/0.7)]" />
          </div>
        </div>

        <div className="container mx-auto px-4 pb-14 pt-12 text-center sm:pb-20 sm:pt-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.3em] text-gold">
            <Crown className="h-3.5 w-3.5" /> FCDGL 2026
          </div>
          <h1 className="mt-6 text-5xl font-black uppercase leading-[0.9] tracking-tight sm:text-7xl md:text-8xl">
            <span className="finale-gold-text">Season</span>
            <br />
            <span className="text-white">Finale</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-white/70 sm:text-lg">
            Two nights. One purse. Free entry for every member with a handicap.
          </p>

          <div className="mt-8 flex flex-col items-center gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/50">Total purse</div>
            <div className="finale-float text-6xl font-black text-money drop-shadow-[0_0_30px_oklch(0.65_0.2_145/0.45)] sm:text-8xl">
              <CountUp value={FINALE_POOL} />
            </div>
            {acePool > 0 && (
              <div className="mt-1 inline-flex items-center gap-2 text-sm text-white/60">
                <Disc className="h-4 w-4 text-money" /> plus the {money(acePool)} ace pool, still live
              </div>
            )}
            <div className="mt-3 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-xs font-semibold text-amber-300">
              Prize money is finalized Nov 4. One regular round left, so amounts may still change.
            </div>
          </div>

          {next && (
            <div className="mt-10">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-white/50">{next.label}</div>
              <Countdown target={next.target} />
            </div>
          )}

          {/* Event jump cards */}
          <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
            <a href="#doubles" className="finale-glass group rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:border-gold/40">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gold">
                  <Users2 className="h-4 w-4" /> Night 1 · Doubles
                </span>
                <span className="font-black text-money">{money(DOUBLES_POOL)}</span>
              </div>
              <div className="mt-2 text-lg font-bold">
                {formatDate(DOUBLES_FINALE.date, "EEE, MMM d")} · {DOUBLES_FINALE.timeLabel}
              </div>
              <div className="flex items-center gap-1 text-sm text-white/50 group-hover:text-white/80">
                {doubles.week?.course_name || DOUBLES_FINALE.location} <ArrowDown className="h-3.5 w-3.5" />
              </div>
            </a>
            <a href="#singles" className="finale-glass group rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:border-gold/40">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gold">
                  <Crown className="h-4 w-4" /> Night 2 · Singles
                </span>
                <span className="font-black text-money">{money(SINGLES_POOL)}</span>
              </div>
              <div className="mt-2 text-lg font-bold">
                {formatDate(SINGLES_FINALE.date, "EEE, MMM d")} · {SINGLES_FINALE.timeLabel}
              </div>
              <div className="flex items-center gap-1 text-sm text-white/50 group-hover:text-white/80">
                {singles.week?.course_name || SINGLES_FINALE.location} <ArrowDown className="h-3.5 w-3.5" />
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ RULES */}
      <section className="border-b border-white/10 bg-black/20">
        <div className="container mx-auto grid gap-3 px-4 py-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Rule icon={<Ticket className="h-4 w-4" />} title="Free entry" text="No buy-in either night." />
          <Rule icon={<ShieldCheck className="h-4 w-4" />} title="Members only" text={`Members with a handicap. ${eligible.length} eligible.`} />
          <Rule icon={<Lock className="h-4 w-4" />} title="Handicaps locked" text="Set after the last regular round, Oct 29." />
          <Rule icon={<Swords className="h-4 w-4" />} title="Ties = playoff" text="Tied for a paid spot? Settle it on the course." />
        </div>
      </section>

      {/* ------------------------------------------------------------ DOUBLES */}
      <section className="container mx-auto space-y-8 px-4 py-14">
        <EventHeader
          id="doubles"
          eyebrow="Night 1"
          title={DOUBLES_FINALE.title}
          date={DOUBLES_FINALE.date}
          timeLabel={DOUBLES_FINALE.timeLabel}
          location={DOUBLES_FINALE.location}
          pool={DOUBLES_POOL}
          data={doubles}
          icon="doubles"
        />
        <a
          href={DOUBLES_LAYOUT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col gap-3 rounded-2xl border border-accent/40 bg-gradient-to-r from-accent/15 via-accent/5 to-transparent p-5 transition hover:border-accent/70 sm:flex-row sm:items-center"
        >
          <MapIcon className="h-10 w-10 shrink-0 text-accent" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-black">New 9-hole Safari layout</span>
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                Live on UDisc
              </span>
            </div>
            <p className="mt-1 text-sm text-white/65">
              The doubles finale is played on a special 9-hole safari layout instead of the normal 18. It&apos;s live on UDisc now, so get out and practice it.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-bold text-accent group-hover:gap-3">
            View on UDisc <ExternalLink className="h-4 w-4" />
          </span>
        </a>
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <SectionLabel>Team Leaderboard</SectionLabel>
            <Leaderboard
              standings={doubles.result.standings}
              paidPlaces={DOUBLES_FINALE.places.length}
              mode={doubles.week?.doubles_scoring_type === "raw" ? "doubles-raw" : "doubles-handicap"}
              emptyText={doubles.week ? "Scores will appear here as cards come in." : "Teams are drawn on the night."}
            />
          </div>
          <div className="space-y-4 lg:col-span-2">
            <SectionLabel>The Purse</SectionLabel>
            <PrizeBoard prizes={doubles.result.prizes} />
            <p className="text-xs text-white/45">Team prizes are split between partners.</p>
          </div>
        </div>
        <div className="space-y-4">
          <SectionLabel>Closest to the Pin</SectionLabel>
          <CtpMap
            specs={DOUBLES_FINALE.ctps}
            prizes={doubles.result.prizes}
            perPlayerNote="Holes 7 & 8 during the round, then partners split up for two throw-off holes: one throw each. Every CTP is $40 per team."
          />
        </div>
      </section>

      <div className="container mx-auto px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      </div>

      {/* ------------------------------------------------------------ SINGLES */}
      <section className="container mx-auto space-y-8 px-4 py-14">
        <EventHeader
          id="singles"
          eyebrow="Night 2"
          title={SINGLES_FINALE.title}
          date={SINGLES_FINALE.date}
          timeLabel={SINGLES_FINALE.timeLabel}
          location={SINGLES_FINALE.location}
          pool={SINGLES_POOL}
          data={singles}
          icon="singles"
        />
        <div className="space-y-4">
          <SectionLabel>The Purse</SectionLabel>
          <PrizeBoard prizes={singles.result.prizes} />
          {!singles.week && (
            <p className="text-xs text-white/45">
              Handicap prizes show the current holders among all eligible members. Handicaps lock after Oct 29.
            </p>
          )}
        </div>
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <SectionLabel>Leaderboard · Handicap</SectionLabel>
            <Leaderboard
              standings={singles.result.standings}
              paidPlaces={SINGLES_FINALE.places.length}
              mode="singles"
              emptyText={singles.week ? "Scores will appear here as cards come in." : "The field is set on the night."}
            />
          </div>
          <div className="space-y-4 lg:col-span-2">
            <SectionLabel>Low Raw</SectionLabel>
            <Leaderboard
              standings={(singles.result.lowRaw || []).slice(0, 8)}
              paidPlaces={SINGLES_FINALE.lowRaw.length}
              mode="low-raw"
              emptyText="Best raw score, no handicap. Pays 1st and 2nd."
            />
          </div>
        </div>
        <div className="space-y-4">
          <SectionLabel>Closest to the Pin · 18 holes</SectionLabel>
          <CtpMap
            specs={SINGLES_FINALE.ctps}
            prizes={singles.result.prizes}
            perPlayerNote="Odd holes at Akron, even holes at Rochester. $10 per hole, split across the winning card."
          />
          <div className="flex gap-4 text-xs text-white/50">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary/60" /> Akron</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-accent/60" /> Rochester</span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ SPONSORS */}
      <section className="container mx-auto px-4 pb-14">
        <div className="finale-border rounded-2xl p-[2px]">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-background px-6 py-8 text-center sm:flex-row sm:text-left">
            <Handshake className="h-10 w-10 shrink-0 text-gold" />
            <div className="flex-1">
              <div className="text-xl font-black">Want to sponsor the Season Finale?</div>
              <p className="mt-1 text-sm text-white/65">
                Sponsors grow the purse and get a shout-out at both events. If you&apos;d like to be a sponsor, contact Trevor.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ FOOTER */}
      <section className="border-t border-white/10 bg-black/20">
        <div className="container mx-auto flex flex-col items-center gap-3 px-4 py-10 text-center">
          <DiscIcon className="h-10 w-10" />
          <p className="max-w-md text-sm text-white/60">
            Thanks for a great season. See you on the course.
          </p>
          <Link href="/schedule" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            <CalendarDays className="h-4 w-4" /> Full schedule
          </Link>
        </div>
      </section>
    </div>
  )
}

function Rule({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <span className="mt-0.5 text-gold">{icon}</span>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-white/55">{text}</div>
      </div>
    </div>
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
