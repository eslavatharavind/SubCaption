import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { AuthProvider } from '@/lib/auth-context';

const inter = Inter({ subsets: ['latin'] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
  : process.env.VERCEL_URL
  ? new URL(`https://${process.env.VERCEL_URL}`)
  : undefined;

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: 'SubCaption - AI Video Caption Generator',
    template: '%s | SubCaption',
  },
  description: 'Create animated subtitles and captions for your videos with SubCaption.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: 'SubCaption - AI Video Caption Generator',
    description: 'Create animated subtitles and captions for your videos with SubCaption.',
    images: [{ url: '/icon.png', width: 512, height: 512, alt: 'SubCaption Logo' }],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'SubCaption - AI Video Caption Generator',
    description: 'Create animated subtitles and captions for your videos with SubCaption.',
    images: ['/icon.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-[#0B0D10]">
      <body className={`${inter.className} bg-[#0B0D10] text-[#F5F7FA] min-h-screen antialiased`}>
        <AuthProvider>
          <Providers>{children}</Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
