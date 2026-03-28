import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ALT MAX — Portal BI',
  description: 'Dashboard financeiro integrado à Omie',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body>{children}</body>
    </html>
  )
}
