import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tetris Ultra - Next Generation Block Game',
  description: 'Revolutionary Tetris with modern features and stunning design',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
