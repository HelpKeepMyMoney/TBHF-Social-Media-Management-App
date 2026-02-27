'use client';

import { usePathname } from 'next/navigation';

const PAGE_TITLES: Record<string, string> = {
  '/':           'Overview',
  '/campaigns':  'Campaigns',
  '/ai-studio':  'AI Studio',
  '/posts':      'Posts',
  '/calendar':   'Content Calendar',
  '/analytics':  'Analytics',
  '/reports':    'Board Reports',
  '/settings':   'Settings',
};

export function Header() {
  const pathname = usePathname();

  // Find best matching title
  const title = Object.entries(PAGE_TITLES)
    .filter(([key]) => pathname === key || (key !== '/' && pathname.startsWith(key)))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? 'TBHF Social Studio';

  return (
    <header className="h-14 border-b border-stone-200 bg-white/80 backdrop-blur sticky top-0 z-30 flex items-center px-6">
      <h1 className="text-base font-semibold text-stone-900">{title}</h1>
    </header>
  );
}
