import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'JumpLeague Cuts',
  description:
    'Interaktive 3D-WebGL-Plattform zum Erlernen, Filtern, Einreichen und Bewerten von Minecraft JumpLeague Cuts & Abkürzungen.',
  icons: {
    icon: '/images/jumpleague-logo.png?v=2',
    shortcut: '/images/jumpleague-logo.png?v=2',
    apple: '/images/jumpleague-logo.png?v=2',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} dark antialiased`}
    >
      <body className="min-h-screen bg-[#11141e] text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-200">
        {children}
      </body>
    </html>
  );
}
