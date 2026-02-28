"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Icon } from '@iconify/react';
import { useSupabase } from '@/lib/supabase-provider';
import { useBranding } from '@/lib/hooks/useBranding';
import SmartSearch from '@/app/components/SmartSearch';
import NotificationButton from '@/app/components/NotificationButton';

export default function MobileHeader() {
  const { user, signOut } = useSupabase();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { siteShortName, logoUrl, logoSize } = useBranding();
  const isAuthenticated = !!user;

  // Close menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpen && !(event.target as Element).closest('.mobile-header-menu')) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-lg lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="relative">
            <Image
              src={logoUrl}
              alt={`${siteShortName} Logo`}
              width={parseInt(logoSize) || 40}
              height={parseInt(logoSize) || 40}
              className="object-contain"
              style={{ width: `${parseInt(logoSize) || 40}px`, height: `${parseInt(logoSize) || 40}px` }}
              priority
            />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {siteShortName}
          </span>
        </Link>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="w-10">
            <SmartSearch compact />
          </div>

          {/* Notifications */}
          {isAuthenticated && (
            <NotificationButton userId={user.id} />
          )}

          {/* Menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-3 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
            aria-label="Menu"
          >
            <Icon
              icon={menuOpen ? 'material-symbols:close' : 'material-symbols:menu'}
              className="w-6 h-6"
            />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="mobile-header-menu absolute top-full left-0 right-0 bg-white border-t border-gray-200 shadow-xl max-h-[calc(100vh-64px)] overflow-y-auto" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="px-4 py-4 space-y-1">
            {/* Main Navigation */}
            <Link
              href="/"
              className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                pathname === '/'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon icon="material-symbols:home" className="w-5 h-5" />
                Home
              </div>
            </Link>

            <Link
              href="/courses"
              className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                pathname.startsWith('/courses')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon icon="material-symbols:book" className="w-5 h-5" />
                Courses
              </div>
            </Link>

            {isAuthenticated && (
              <>
                <Link
                  href="/dashboard"
                  className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    pathname.startsWith('/dashboard')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon icon="material-symbols:dashboard" className="w-5 h-5" />
                    Dashboard
                  </div>
                </Link>

                <Link
                  href="/my-courses"
                  className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    pathname.startsWith('/my-courses')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon icon="material-symbols:school" className="w-5 h-5" />
                    My Courses
                  </div>
                </Link>

                <Link
                  href="/profile"
                  className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    pathname.startsWith('/profile')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon icon="material-symbols:person" className="w-5 h-5" />
                    Profile
                  </div>
                </Link>

                <div className="border-t border-gray-200 my-2"></div>

                <button
                  onClick={async () => {
                    await signOut();
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 bg-red-50 text-red-600 font-medium rounded-xl hover:bg-red-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Icon icon="material-symbols:logout" className="w-5 h-5" />
                    Sign Out
                  </div>
                </button>
              </>
            )}

            {!isAuthenticated && (
              <>
                <div className="border-t border-gray-200 my-2"></div>
                <Link
                  href="/auth/signin"
                  className="block w-full px-4 py-3 text-center text-gray-700 font-medium border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="block w-full px-4 py-3 text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}


