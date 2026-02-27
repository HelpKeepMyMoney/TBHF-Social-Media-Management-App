import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'TBHF Social Studio',
    template: '%s | TBHF Social Studio',
  },
  description: 'Internal social media management platform for nonprofit campaign coordination.',
  robots: { index: false, follow: false }, // Internal tool — do not index
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
