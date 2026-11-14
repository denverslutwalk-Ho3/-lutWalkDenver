import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import SiteHeader from './components/SiteHeader';
import Footer from './components/Footer';

export const metadata: Metadata = {
  metadataBase: new URL('https://slutwalkdenver.gay'),
  title: {
    default: '$lutWalk Denver | Community Hub for Organizing, Education & Care',
    template: '%s | $lutWalk Denver',
  },
  description: 'SlutWalk Denver is a survivor-led collective for community organizing, education, and mutual aid. Access resources, events, and member spaces.',
  keywords: ['SlutWalk Denver', 'sex worker rights', 'bodily autonomy', 'mutual aid', 'community organizing', 'education', 'zines'],
  authors: [{ name: 'SlutWalk Denver Collective' }],
  creator: 'SlutWalk Denver Collective',
  publisher: 'SlutWalk Denver Collective',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://slutwalkdenver.gay',
    siteName: '$lutWalk Denver',
    title: '$lutWalk Denver',
    description: 'A living collective for organizing, education, and mutual aid in Denver.',
    images: [{ url: '/media/slutwalk-logo.jpg', alt: '$lutWalk Denver logo' }],
  },
  twitter: {
    card: 'summary',
    title: '$lutWalk Denver',
    description: 'Community hub for sex worker rights and bodily autonomy.',
    images: ['/media/slutwalk-logo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0e0b0d" />
        <meta name="apple-mobile-web-app-title" content="$lutWalk Denver" />
        <meta name="application-name" content="$lutWalk Denver" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'NGO',
            name: 'SlutWalk Denver',
            url: 'https://slutwalkdenver.gay',
            description: 'A survivor-led community space for SlutWalk Denver. A living collective for organizing, education, and mutual aid.',
            foundingDate: '2011',
            address: {
              '@type': 'PostalAddress',
              addressLocality: 'Denver',
              addressRegion: 'CO',
              addressCountry: 'US',
            },
            sameAs: [
              'https://x.com/DenverSlutwalk',
              'https://www.instagram.com/denverslutwalk/',
              'https://mastodon.social/@DenverSlutWalk',
            ],
          })}
        </script>
      </head>
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <SiteHeader />
        <div id="main-content">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
