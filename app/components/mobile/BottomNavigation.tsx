"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@iconify/react';
import { useSupabase } from '@/lib/supabase-provider';

export default function BottomNavigation() {
  const pathname = usePathname();
  const { user } = useSupabase();
  const isAuthenticated = !!user;

  // Don't show on certain pages
  const hideOnPages = ['/auth/signin', '/auth/signup', '/offline'];
  if (hideOnPages.some(page => pathname.startsWith(page))) {
    return null;
  }

  const navItems = [
    {
      href: '/',
      label: 'Home',
      icon: 'material-symbols:home',
      activeIcon: 'material-symbols:home',
    },
    {
      href: '/courses',
      label: 'Courses',
      icon: 'material-symbols:book',
      activeIcon: 'material-symbols:book',
    },
    ...(isAuthenticated
      ? [
          {
            href: '/dashboard',
            label: 'Dashboard',
            icon: 'material-symbols:dashboard',
            activeIcon: 'material-symbols:dashboard',
          },
          {
            href: '/my-courses',
            label: 'My Courses',
            icon: 'material-symbols:school',
            activeIcon: 'material-symbols:school',
          },
        ]
      : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around h-16 px-1 max-w-screen-sm mx-auto overflow-hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center flex-1 h-full min-w-0 px-1 transition-all duration-200 ${
                isActive
                  ? ''
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              style={isActive ? { color: 'var(--theme-primary)' } : undefined}
            >
              <Icon
                icon={isActive ? item.activeIcon : item.icon}
                className={`w-6 h-6 mb-1 ${isActive ? 'scale-110' : ''} transition-transform duration-200`}
              />
              <span className={`text-xs font-medium truncate w-full text-center ${
                isActive ? 'font-semibold' : ''
              }`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1 right-1 h-1 rounded-t-full" style={{ backgroundColor: 'var(--theme-primary)' }} />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}


