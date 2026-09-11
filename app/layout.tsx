import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AdminProvider } from '@/components/admin-provider'
import { Navigation } from '@/components/navigation'
import { isAdminSession } from '@/lib/admin-auth'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'FCDGL - Fulton County Disc Golf League',
  description: 'Fulton County Disc Golf League - Weekly results, player stats, handicaps, and leaderboards',
  openGraph: {
    title: 'FCDGL - Fulton County Disc Golf League',
    description: 'Weekly results, player stats, handicaps, and leaderboards',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FCDGL - Fulton County Disc Golf League',
    description: 'Weekly results, player stats, handicaps, and leaderboards',
  },
  icons: {
    icon: '/images/fcdgl-logo.png',
    shortcut: '/images/fcdgl-logo.png',
    apple: '/images/fcdgl-logo.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a1a2e',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const isAdmin = await isAdminSession()
  return (
    <html lang="en">
      <body className="font-sans antialiased min-h-screen bg-background text-foreground">
        <AdminProvider initialIsAdmin={isAdmin}>
          <Navigation />
          <main className="pb-8">
            {children}
          </main>
        </AdminProvider>
        <Analytics />
      </body>
    </html>
  )
}
