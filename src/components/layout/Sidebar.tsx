'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Megaphone,
  Wand2,
  FileText,
  Calendar,
  BarChart2,
  ClipboardList,
  Settings,
  Heart,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  label:  string;
  href:   string;
  icon:   React.ReactNode;
  roles?: Array<'admin' | 'staff' | 'board'>;
}

const navItems: NavItem[] = [
  { label: 'Overview',   href: '/',           icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Campaigns',  href: '/campaigns',  icon: <Megaphone        className="h-4 w-4" />, roles: ['admin', 'staff'] },
  { label: 'AI Studio',  href: '/ai-studio',  icon: <Wand2            className="h-4 w-4" />, roles: ['admin', 'staff'] },
  { label: 'Posts',      href: '/posts',      icon: <FileText         className="h-4 w-4" />, roles: ['admin', 'staff'] },
  { label: 'Calendar',   href: '/calendar',   icon: <Calendar         className="h-4 w-4" />, roles: ['admin', 'staff'] },
  { label: 'Analytics',  href: '/analytics',  icon: <BarChart2        className="h-4 w-4" /> },
  { label: 'Reports',    href: '/reports',    icon: <ClipboardList    className="h-4 w-4" /> },
  { label: 'Settings',   href: '/settings',   icon: <Settings         className="h-4 w-4" />, roles: ['admin'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const visibleItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-stone-200 flex flex-col h-screen sticky top-0 z-40">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500">
            <Heart className="h-4 w-4 text-white fill-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-stone-900 leading-none">Social Studio</p>
            <p className="text-xs text-stone-400 mt-0.5">TBHF Internal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
                  )}
                >
                  <span
                    className={cn(
                      isActive ? 'text-brand-600' : 'text-stone-400',
                    )}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User footer */}
      {user && (
        <div className="px-3 py-4 border-t border-stone-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-semibold shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-stone-800 truncate">{user.name}</p>
              <p className="text-xs text-stone-400 capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="btn-ghost w-full mt-1 text-stone-500 hover:text-red-600 hover:bg-red-50 justify-start"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
