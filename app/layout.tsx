import type { Metadata } from 'next'
import { DM_Mono, Fraunces } from 'next/font/google'
import './globals.css'

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-mono',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'Operation-Architect',
  description: 'Operational intelligence for organizations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${dmMono.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  )
}
