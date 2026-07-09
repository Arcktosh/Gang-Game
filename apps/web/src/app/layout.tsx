import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '@/features/ui/toast-provider';
import './globals.css';

const siteName = 'DrugDeal Game';
const siteDescription =
  'A fictional text-based persistent browser MMO with jobs, crimes, factions, markets, shops, messaging, and seasonal progression.';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: `${siteName} - Fictional Browser MMO`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [
    'browser MMO',
    'text-based game',
    'persistent game',
    'fictional crime economy',
    'strategy RPG',
  ],
  authors: [{ name: 'DrugDeal Game Team' }],
  creator: 'DrugDeal Game Team',
  publisher: 'DrugDeal Game Team',
  manifest: '/manifest.webmanifest',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName,
    title: `${siteName} - Fictional Browser MMO`,
    description: siteDescription,
    images: [
      {
        url: '/opengraph-image.svg',
        width: 1200,
        height: 630,
        alt: `${siteName} preview`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteName} - Fictional Browser MMO`,
    description: siteDescription,
    images: ['/opengraph-image.svg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#09090b',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <ToastProvider>
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
