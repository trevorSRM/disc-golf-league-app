import { Calendar, Crown, Disc, DollarSign, MapPin, Trophy, Users2 } from "lucide-react"
import { CtpMap, Leaderboard, PrizeBoard, money } from "@/components/finale/finale-sections"
import { formatDate } from "@/lib/utils"
import type { FinaleSnapshot, SeasonSummary } from "@/lib/seasons"

// A locked season, rendered from its snapshot only (never from live tables).
export function SeasonRecap({ summary }: { summary: SeasonSummary }) {
  const { singles, doubles, aces, stats, moneyLeaders, winsLeaders } = summary
  return (
    <div className="space-y-14">
      <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2">
        <Champion label="Singles Champion" icon={<Crown className="h-4 w-4" />} href="#singles" event={singles} />
        <Champion label="Doubles Champions" icon={<Users2 className="h-4 w-4" />} href="#doubles" event={doubles} />
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Events" value={stats.events} />
          <Stat label="Players" value={stats.players} />
          <Stat label="Members" value={stats.members} />
          <Stat label="Rounds played" value={stats.rounds} />
        </div>
      )}

      {(winsLeaders?.length || moneyLeaders?.length) ? (
        <div className="grid gap-8 lg:grid-cols-2">
          {winsLeaders && winsLeaders.length > 0 && (
            <div className="space-y-4">
              <SectionLabel>Most Wins</SectionLabel>
              <SimpleTable
                rows={winsLeaders.map(w => ({ name: w.name, value: String(w.wins), sub: `${w.singles} singles · ${w.doubles} doubles` }))}
              />
            </div>
          )}
          {moneyLeaders && moneyLeaders.length > 0 && (
            <div className="space-y-4">
              <SectionLabel>Money Leaders</SectionLabel>
              <SimpleTable rows={moneyLeaders.map(m => ({ name: m.name, value: money(m.total) }))} />
            </div>
          )}
        </div>
      ) : null}

      {singles && (
        <section className="space-y-8">
          <EventTitle id="singles" icon={<Crown className="h-8 w-8 text-gold" />} event={singles} eyebrow="Season Finale · Singles" />
          <div className="grid gap-8 lg:grid-cols-5">
            <div className="space-y-4 lg:col-span-3">
              <SectionLabel>Final Standings</SectionLabel>
              <Leaderboard standings={singles.standings} paidPlaces={singles.paidPlaces} mode={singles.mode} emptyText="No results." />
            </div>
            {singles.lowRaw && singles.lowRaw.length > 0 && (
              <div className="space-y-4 lg:col-span-2">
                <SectionLabel>Low Raw</SectionLabel>
                <Leaderboard standings={singles.lowRaw.slice(0, 8)} paidPlaces={singles.lowRawPaid ?? 0} mode="low-raw" emptyText="" />
              </div>
            )}
          </div>
          <div className="space-y-4">
            <SectionLabel>Payouts</SectionLabel>
            <PrizeBoard prizes={singles.prizes} />
          </div>
          <div className="space-y-4">
            <SectionLabel>Closest to the Pin</SectionLabel>
            <CtpMap specs={singles.ctpSpecs} prizes={singles.prizes} perPlayerNote={singles.ctpNote} />
          </div>
        </section>
      )}

      {doubles && (
        <section className="space-y-8">
          <EventTitle id="doubles" icon={<Users2 className="h-8 w-8 text-gold" />} event={doubles} eyebrow="Season Finale · Doubles" />
          <div className="grid gap-8 lg:grid-cols-5">
            <div className="space-y-4 lg:col-span-3">
              <SectionLabel>Final Standings</SectionLabel>
              <Leaderboard standings={doubles.standings} paidPlaces={doubles.paidPlaces} mode={doubles.mode} emptyText="No results." />
            </div>
            <div className="space-y-4 lg:col-span-2">
              <SectionLabel>Payouts</SectionLabel>
              <PrizeBoard prizes={doubles.prizes} />
              <p className="text-xs text-white/45">Team prizes are split between partners.</p>
            </div>
          </div>
          <div className="space-y-4">
            <SectionLabel>Closest to the Pin</SectionLabel>
            <CtpMap specs={doubles.ctpSpecs} prizes={doubles.prizes} perPlayerNote={doubles.ctpNote} />
          </div>
        </section>
      )}

      {aces.length > 0 && (
        <section className="space-y-4">
          <SectionLabel>Aces</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {aces.map((a, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-money/30 bg-money/5 p-4">
                <Disc className="h-8 w-8 shrink-0 text-money" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{a.name}</div>
                  <div className="text-xs text-white/55">
                    {[a.course, a.hole ? `Hole ${a.hole}` : null, formatDate(a.date, "MMM d")].filter(Boolean).join(" · ")}
                  </div>
                </div>
                {a.payout > 0 && <span className="font-black text-money">{money(a.payout)}</span>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Champion({ label, icon, href, event }: { label: string; icon: React.ReactNode; href: string; event: FinaleSnapshot | null }) {
  const winners = event?.standings.filter(s => s.position === 1) ?? []
  return (
    <a href={href} className="finale-glass group rounded-2xl p-5 text-left transition hover:-translate-y-0.5 hover:border-gold/40">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gold">
          {icon} {label}
        </span>
        <Trophy className="h-5 w-5 text-gold" />
      </div>
      <div className="mt-3 text-2xl font-black leading-tight">
        {winners.length ? winners.map(w => w.name).join(" / ") : "—"}
      </div>
    </a>
  )
}

function EventTitle({ id, icon, event, eyebrow }: { id: string; icon: React.ReactNode; event: FinaleSnapshot; eyebrow: string }) {
  return (
    <div id={id} className="scroll-mt-24">
      <span className="text-xs font-bold uppercase tracking-[0.3em] text-gold">{eyebrow}</span>
      <h2 className="mt-2 flex items-center gap-3 text-3xl font-black tracking-tight sm:text-4xl">
        {icon}
        {event.title}
      </h2>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/60">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" /> {formatDate(event.date, "EEEE, MMM d, yyyy")}
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4" /> {event.location}
        </span>
        <span className="flex items-center gap-1.5">
          <DollarSign className="h-4 w-4" /> {money(event.pool)} purse
        </span>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
      <div className="text-3xl font-black tabular-nums">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-widest text-white/50">{label}</div>
    </div>
  )
}

function SimpleTable({ rows }: { rows: { name: string; value: string; sub?: string }[] }) {
  return (
    <div className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <span className="w-6 font-black tabular-nums text-white/40">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{r.name}</div>
            {r.sub && <div className="text-xs text-white/45">{r.sub}</div>}
          </div>
          <span className="font-bold tabular-nums">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-white/60">
      {children}
      <span className="h-px flex-1 bg-white/10" />
    </h3>
  )
}
