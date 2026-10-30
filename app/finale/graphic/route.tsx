import { ImageResponse } from "next/og"
import { DOUBLES_FINALE, DOUBLES_POOL, FINALE_POOL, SINGLES_FINALE, SINGLES_POOL } from "@/lib/finale"

// Shareable Season Finale graphic (Facebook / Instagram portrait post, 1080x1350).
// Open /finale/graphic to download the PNG.
export const runtime = "edge"

const W = 1080
const H = 1350
const GOLD = "#f2c14e"
const GOLD_DEEP = "#c98a1b"
const NAVY = "#0b1530"
const BLUE = "#3b82f6"
const GREEN = "#34d27a"

function Disc({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        background: `radial-gradient(circle at 38% 32%, #fff3c4 0%, ${GOLD} 45%, ${GOLD_DEEP} 100%)`,
        boxShadow: `0 0 80px ${GOLD}88`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: size * 0.72,
          height: size * 0.72,
          borderRadius: size,
          border: `3px solid ${GOLD_DEEP}aa`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: size * 0.38, height: size * 0.38, borderRadius: size, border: `2px solid ${GOLD_DEEP}77` }} />
      </div>
    </div>
  )
}

function EventCard({
  night,
  kind,
  date,
  time,
  place,
  extra,
  pool,
  accent,
}: {
  night: string
  kind: string
  date: string
  time: string
  place: string
  extra: string
  pool: number
  accent: string
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "34px 34px 30px",
        borderRadius: 28,
        border: `2px solid ${accent}66`,
        background: "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03))",
      }}
    >
      <div style={{ display: "flex", fontSize: 24, fontWeight: 800, letterSpacing: 6, color: accent }}>{night}</div>
      <div style={{ display: "flex", fontSize: 54, fontWeight: 900, color: "white", marginTop: 6 }}>{kind}</div>
      <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: "white", marginTop: 18 }}>{date}</div>
      <div style={{ display: "flex", fontSize: 30, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>
        {time} · {place}
      </div>
      <div style={{ display: "flex", fontSize: 24, color: "rgba(255,255,255,0.55)", marginTop: 10 }}>{extra}</div>
      <div style={{ display: "flex", fontSize: 52, fontWeight: 900, color: GREEN, marginTop: 22 }}>${pool}</div>
    </div>
  )
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: `radial-gradient(ellipse at 50% 0%, #22407a 0%, ${NAVY} 60%)`,
          color: "white",
          fontFamily: "sans-serif",
          position: "relative",
          padding: "60px 64px",
        }}
      >
        {/* glows */}
        <div style={{ position: "absolute", left: -180, top: 120, width: 520, height: 520, borderRadius: 520, background: `${GOLD}22`, filter: "blur(80px)" }} />
        <div style={{ position: "absolute", right: -200, top: 420, width: 600, height: 600, borderRadius: 600, background: `${BLUE}33`, filter: "blur(90px)" }} />

        {/* logos */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${origin}/images/fcdgl-logo.png`} alt="" width={240} height={120} style={{ objectFit: "contain" }} />
          <div style={{ width: 2, height: 70, background: "rgba(255,255,255,0.25)" }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${origin}/images/srm-logo-white.png`} alt="" width={120} height={60} style={{ objectFit: "contain" }} />
        </div>

        {/* title */}
        <div style={{ display: "flex", alignItems: "center", gap: 30, marginTop: 44 }}>
          <Disc size={130} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 800, letterSpacing: 12, color: GOLD }}>FCDGL 2026</div>
            <div style={{ display: "flex", fontSize: 112, fontWeight: 900, lineHeight: 0.95, color: GOLD, textShadow: `0 4px 30px ${GOLD}66` }}>
              SEASON
            </div>
            <div style={{ display: "flex", fontSize: 112, fontWeight: 900, lineHeight: 0.95, color: "white" }}>FINALE</div>
          </div>
        </div>

        {/* purse */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 46 }}>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: 10, color: "rgba(255,255,255,0.6)" }}>TOTAL PURSE</div>
          <div style={{ display: "flex", fontSize: 170, fontWeight: 900, lineHeight: 1, color: GREEN, textShadow: `0 0 60px ${GREEN}66` }}>
            ${FINALE_POOL}
          </div>
        </div>

        {/* events */}
        <div style={{ display: "flex", gap: 28, width: "100%", marginTop: 44 }}>
          <EventCard
            night="NIGHT 1"
            kind="DOUBLES"
            date="Thu, Nov 5"
            time={DOUBLES_FINALE.timeLabel}
            place={DOUBLES_FINALE.location}
            extra="9-hole Safari layout"
            pool={DOUBLES_POOL}
            accent={GOLD}
          />
          <EventCard
            night="NIGHT 2"
            kind="SINGLES"
            date="Sat, Nov 7"
            time={SINGLES_FINALE.timeLabel}
            place="Rochester"
            extra="18 CTPs · Low Raw · Handicap prizes"
            pool={SINGLES_POOL}
            accent={BLUE}
          />
        </div>

        {/* footer */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "auto" }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: "white" }}>
            FREE ENTRY · MEMBERS WITH A HANDICAP
          </div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: GOLD, marginTop: 14 }}>fcdgl.com/finale</div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      headers: { "Cache-Control": "public, max-age=300" },
    }
  )
}
