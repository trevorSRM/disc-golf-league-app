import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Fulton County Disc Golf League'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#1e3a5f',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fcdgl-logo-01-WQFFHutEizCMUifVmlD4pwfArPkAAH.png"
          alt="FCDGL Logo"
          width={500}
          height={500}
          style={{
            objectFit: 'contain',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}
