"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Button from "@/app/components/Button";
import { Icon } from "@iconify/react";
import { useSupabase } from "@/lib/supabase-provider";
import { canAccessAdmin, hasRole } from "@/lib/rbac";
import SmartSearch from "@/app/components/SmartSearch";
import { useBranding } from "@/lib/hooks/useBranding";
import NotificationButton from "@/app/components/NotificationButton";
import TenantSwitcher from "@/app/components/TenantSwitcher";

export default function Navbar() {
  const { user, loading, signOut, supabase } = useSupabase();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [academicsOpen, setAcademicsOpen] = React.useState(false);
  const [engagementOpen, setEngagementOpen] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [role, setRole] = React.useState<string | null>(null);
  const [userName, setUserName] = React.useState<string | null>(null);
  const [userAvatar, setUserAvatar] = React.useState<string | null>(null);
  const { siteShortName, logoUrl, logoSize } = useBranding();

  const isAuthenticated = !!user;

  // Fetch role and name from API endpoint (bypasses RLS and prevents infinite recursion)
  React.useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          // Get auth token and fetch profile from API endpoint
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const res = await fetch('/api/auth/profile', {
              headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
              const profile = await res.json();
              setRole(profile?.role || 'student');
              setUserName(profile?.name || null);
              setUserAvatar(profile?.avatar || null);
              return;
            }
          }
          // Fallback to user_metadata if API call fails
          setRole(user.user_metadata?.role || 'student');
          setUserName(user.user_metadata?.full_name || user.user_metadata?.name || null);
          setUserAvatar(null);
        } catch (error) {
          console.error('Error fetching user profile:', error);
          // Fallback to user_metadata if query fails
          setRole(user.user_metadata?.role || 'student');
          setUserName(user.user_metadata?.full_name || user.user_metadata?.name || null);
          setUserAvatar(null);
        }
      } else {
        setRole(null);
        setUserName(null);
        setUserAvatar(null);
      }
    };

    fetchUserProfile();
  }, [user, supabase]);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (academicsOpen && !(event.target as Element).closest('.academics-dropdown')) {
        setAcademicsOpen(false);
      }
      if (engagementOpen && !(event.target as Element).closest('.engagement-dropdown')) {
        setEngagementOpen(false);
      }
      if (moreOpen && !(event.target as Element).closest('.more-dropdown')) {
        setMoreOpen(false);
      }
      if (userMenuOpen && !(event.target as Element).closest('.user-menu')) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [academicsOpen, engagementOpen, moreOpen, userMenuOpen]);

  // Close mobile menu when route changes
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Theme-aware active link styles
  const activeStyle = { backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)', color: 'var(--theme-primary)' };
  const activeLinkClass = (isActive: boolean) => isActive
    ? 'shadow-sm'
    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100';
  const activeMobileClass = (isActive: boolean) => isActive
    ? ''
    : 'text-gray-700 hover:bg-gray-100';

  return (
    <header className="hidden lg:block sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-lg">
      <nav className="flex w-full items-center justify-between px-6 py-3">
        {/* Logo Section */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group transition-all duration-200 hover:opacity-90">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-200 blur-sm" style={{ background: 'linear-gradient(to bottom right, var(--theme-primary), var(--theme-secondary))' }}></div>
              <Image
                src={logoUrl}
                alt={`${siteShortName} Logo`}
                width={parseInt(logoSize) || 48}
                height={parseInt(logoSize) || 48}
                className="object-contain relative z-10 transition-transform duration-200 group-hover:scale-105"
                style={{ width: `${parseInt(logoSize) || 48}px`, height: `${parseInt(logoSize) || 48}px` }}
                priority
              />
            </div>
            <div className="flex flex-col">
        <span className="text-lg font-bold bg-clip-text text-transparent leading-tight" style={{ backgroundImage: 'linear-gradient(to right, var(--theme-primary), var(--theme-secondary))' }}>
          {siteShortName}
        </span>
              <div className="text-[10px] text-gray-500 font-medium leading-tight tracking-wide">
                Powered by Learnboard
              </div>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-1 lg:flex">
          {/* Home */}
          <Link
            href="/"
            className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${activeLinkClass(pathname === '/')}`}
            style={pathname === '/' ? activeStyle : undefined}
          >
            Home
          </Link>

          {/* Academics Dropdown */}
          {role !== 'student' && (
            <div className="relative academics-dropdown">
              <button
                onClick={() => { setAcademicsOpen(!academicsOpen); setEngagementOpen(false); setMoreOpen(false); }}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center gap-1 ${activeLinkClass(pathname.startsWith('/programmes') || pathname.startsWith('/courses'))}`}
                style={(pathname.startsWith('/programmes') || pathname.startsWith('/courses')) ? activeStyle : undefined}
              >
                Academics
                <svg className={`w-4 h-4 transition-transform duration-200 ${academicsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {academicsOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-200 py-3 z-50 backdrop-blur-md">
                  <Link href="/programmes" onClick={() => setAcademicsOpen(false)} className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors rounded-lg mx-2">
                    <div className="flex items-center gap-3">
                      <Icon icon="material-symbols:school" className="w-5 h-5 text-indigo-500" />
                      Programmes
                    </div>
                  </Link>
                  <Link href="/courses" onClick={() => setAcademicsOpen(false)} className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors rounded-lg mx-2">
                    <div className="flex items-center gap-3">
                      <Icon icon="material-symbols:book" className="w-5 h-5 text-blue-500" />
                      Courses
                    </div>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Dashboard */}
          {isAuthenticated && (
            <Link
              href="/dashboard"
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${activeLinkClass(pathname.startsWith('/dashboard'))}`}
              style={pathname.startsWith('/dashboard') ? activeStyle : undefined}
            >
              Dashboard
            </Link>
          )}

          {/* Engagement Dropdown */}
          {isAuthenticated && (
            <div className="relative engagement-dropdown">
              <button
                onClick={() => { setEngagementOpen(!engagementOpen); setAcademicsOpen(false); setMoreOpen(false); }}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center gap-1 ${activeLinkClass(pathname.startsWith('/crm') || pathname.startsWith('/discussions'))}`}
                style={(pathname.startsWith('/crm') || pathname.startsWith('/discussions')) ? activeStyle : undefined}
              >
                Engagement
                <svg className={`w-4 h-4 transition-transform duration-200 ${engagementOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {engagementOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-200 py-3 z-50 backdrop-blur-md">
                  {hasRole(role, ['instructor', 'admin', 'super_admin']) && (
                    <Link href="/crm" onClick={() => setEngagementOpen(false)} className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors rounded-lg mx-2">
                      <div className="flex items-center gap-3">
                        <Icon icon="mdi:account-heart" className="w-5 h-5 text-teal-500" />
                        CRM
                      </div>
                    </Link>
                  )}
                  <Link href="/discussions" onClick={() => setEngagementOpen(false)} className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors rounded-lg mx-2">
                    <div className="flex items-center gap-3">
                      <Icon icon="mdi:forum" className="w-5 h-5 text-blue-500" />
                      Discussions
                    </div>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* More Dropdown */}
          <div className="relative more-dropdown">
            <button
              onClick={() => { setMoreOpen(!moreOpen); setAcademicsOpen(false); setEngagementOpen(false); }}
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center gap-1 ${activeLinkClass(pathname.startsWith('/about') || pathname.startsWith('/contact') || pathname.startsWith('/help'))}`}
              style={(pathname.startsWith('/about') || pathname.startsWith('/contact') || pathname.startsWith('/help')) ? activeStyle : undefined}
            >
              More
              <svg className={`w-4 h-4 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {moreOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-200 py-3 z-50 backdrop-blur-md">
                <Link href="/about" onClick={() => setMoreOpen(false)} className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors rounded-lg mx-2">
                  <div className="flex items-center gap-3">
                    <Icon icon="material-symbols:info" className="w-5 h-5 text-blue-500" />
                    About
                  </div>
                </Link>
                <Link href="/contact" onClick={() => setMoreOpen(false)} className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors rounded-lg mx-2">
                  <div className="flex items-center gap-3">
                    <Icon icon="material-symbols:contact-mail" className="w-5 h-5 text-purple-500" />
                    Contact
                  </div>
                </Link>
                <Link href={role === 'admin' || role === 'super_admin' ? '/help/admin' : role === 'instructor' || role === 'curriculum_designer' ? '/help/instructor' : '/help/student'} onClick={() => setMoreOpen(false)} className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors rounded-lg mx-2">
                  <div className="flex items-center gap-3">
                    <Icon icon="material-symbols:help" className="w-5 h-5 text-orange-500" />
                    Help Center
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Search and User Section */}
        <div className="hidden items-center gap-3 lg:flex">
          {/* Search */}
          <div className="search-container relative w-64">
            <SmartSearch compact />
          </div>

          {/* Tenant Switcher (Super Admin Only) */}
          {isAuthenticated && role === 'super_admin' && (
            <TenantSwitcher />
          )}

          {/* System Settings (Admin Only) */}
          {isAuthenticated && canAccessAdmin(role) && (
            <Link
              href="/admin/settings"
              className={`relative p-3 rounded-xl transition-all duration-200 ${activeLinkClass(pathname.startsWith('/admin/settings'))}`}
              style={pathname.startsWith('/admin/settings') ? activeStyle : undefined}
              title="System Settings"
            >
              <Icon icon="material-symbols:settings" className="w-5 h-5" />
            </Link>
          )}

          {/* Messages */}
          {isAuthenticated && (
            <Link
              href="/messages"
              className={`relative p-3 rounded-xl transition-all duration-200 ${activeLinkClass(pathname.startsWith('/messages'))}`}
              style={pathname.startsWith('/messages') ? activeStyle : undefined}
              title="Messages"
            >
              <Icon icon="mdi:chat" className="w-5 h-5" />
            </Link>
          )}

          {/* Notifications */}
          {isAuthenticated && (
            <NotificationButton userId={user.id} />
          )}

          {/* User Section */}
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ) : isAuthenticated ? (
            <div className="relative user-menu">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 transition-all duration-200"
              >
                {userAvatar ? (
                  <img 
                    src={userAvatar} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => {
                      // Fallback to initial if image fails to load
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                      const fallback = (e.currentTarget as HTMLImageElement).nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${userAvatar ? 'hidden' : ''}`}
                  style={{ background: 'linear-gradient(to bottom right, var(--theme-primary), var(--theme-secondary))' }}
                >
                  {(userName || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">
                    {userName || user?.user_metadata?.full_name || user?.user_metadata?.name || 'User'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {role 
                      ? role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                      : 'Student'}
                  </div>
                </div>
                <Icon icon="material-symbols:keyboard-arrow-down" className="w-4 h-4 text-gray-500" />
              </button>
              
              {userMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 py-3 z-50 backdrop-blur-md">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="text-sm font-medium text-gray-900">
                      {user?.user_metadata?.full_name || 'User'}
                    </div>
                    <div className="text-xs text-gray-500">{user?.email}</div>
                  </div>
                  
                  <Link href="/profile" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Icon icon="material-symbols:person" className="w-5 h-5 text-gray-500" />
                      Profile Settings
                    </div>
                  </Link>
                  
                  <Link href="/my-courses" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Icon icon="material-symbols:book" className="w-5 h-5 text-blue-500" />
                      My Courses
                    </div>
                  </Link>
                  
                  <Link href="/profile/certificates" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Icon icon="material-symbols:workspace-premium" className="w-5 h-5 text-purple-500" />
                      My Certificates
                    </div>
                  </Link>

                  {/* Student Experience Tools */}
                  <div className="border-t border-gray-100 my-2"></div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Study Tools
                  </div>
                  <Link href="/student/calendar" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Icon icon="mdi:calendar" className="w-5 h-5 text-blue-500" />
                      My Calendar
                    </div>
                  </Link>
                  <Link href="/student/bookmarks" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Icon icon="mdi:bookmark" className="w-5 h-5 text-amber-500" />
                      Bookmarks
                    </div>
                  </Link>
                  <Link href="/student/notes" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Icon icon="mdi:note-text" className="w-5 h-5 text-yellow-500" />
                      My Notes
                    </div>
                  </Link>
                  <Link href="/student/study-groups" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Icon icon="mdi:account-group" className="w-5 h-5 text-purple-500" />
                      Study Groups
                    </div>
                  </Link>
                  <Link href="/learning-paths" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Icon icon="mdi:road-variant" className="w-5 h-5 text-green-500" />
                      Learning Paths
                    </div>
                  </Link>

                  {hasRole(role, ['instructor', 'admin', 'super_admin']) && (
                    <>
                      <div className="border-t border-gray-100 my-2"></div>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        CRM
                      </div>
                      <Link href="/crm" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon icon="mdi:account-heart" className="w-5 h-5 text-teal-500" />
                          Student CRM
                        </div>
                      </Link>
                    </>
                  )}

                  {hasRole(role, ['instructor', 'curriculum_designer', 'admin', 'super_admin']) && (
                    <>
                      <div className="border-t border-gray-100 my-2"></div>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Lecturer Collaboration
                      </div>
                      <Link href="/lecturers/forums" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon icon="mdi:forum" className="w-5 h-5 text-blue-500" />
                          Forums
                        </div>
                      </Link>
                      <Link href="/lecturers/resources" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon icon="mdi:folder-share" className="w-5 h-5 text-green-500" />
                          Resource Library
                        </div>
                      </Link>
                      <Link href="/lecturers/chat" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon icon="mdi:chat" className="w-5 h-5 text-purple-500" />
                          Staff Room
                        </div>
                      </Link>
                      <div className="border-t border-gray-100 my-2"></div>
                    </>
                  )}
                  
                  <Link href="/dashboard" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Icon icon="material-symbols:dashboard" className="w-5 h-5 text-green-500" />
                      Dashboard
                    </div>
                  </Link>
                  
                  {canAccessAdmin(role) && (
                    <>
                      <Link href="/admin/users/manage" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon icon="material-symbols:people" className="w-5 h-5 text-purple-500" />
                          User Management
                        </div>
                      </Link>
                      <Link href="/admin/courses/manage" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon icon="material-symbols:school" className="w-5 h-5 text-blue-500" />
                          Course Management
                        </div>
                      </Link>
                      <Link href="/admin/tenants" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon icon="material-symbols:account-balance" className="w-5 h-5 text-cyan-500" />
                          Schools
                        </div>
                      </Link>
                      <Link href="/admin/settings" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon icon="material-symbols:settings" className="w-5 h-5 text-orange-500" />
                          System Settings
                        </div>
                      </Link>
                      <Link href="/admin/lti-tools" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon icon="material-symbols:link" className="w-5 h-5 text-teal-500" />
                          LTI Tools
                        </div>
                      </Link>
                      <Link href="/admin/lti-platforms" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon icon="material-symbols:cloud-upload" className="w-5 h-5 text-blue-500" />
                          LTI Platforms
                        </div>
                      </Link>
                      <Link href="/admin/sonisweb" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon icon="material-symbols:sync" className="w-5 h-5 text-violet-500" />
                          SonisWeb SIS
                        </div>
                      </Link>
                      <Link href="/admin/question-banks" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon icon="material-symbols:quiz" className="w-5 h-5 text-indigo-500" />
                          Question Banks
                        </div>
                      </Link>
                      <Link href="/surveys" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon icon="material-symbols:poll" className="w-5 h-5 text-teal-500" />
                          Surveys & Evaluations
                        </div>
                      </Link>
                      <Link href="/admin/settings/branding" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon icon="material-symbols:palette" className="w-5 h-5 text-purple-500" />
                          Branding Settings
                        </div>
                      </Link>
                      <Link href="/admin/users" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon icon="material-symbols:admin-panel-settings" className="w-5 h-5 text-red-500" />
                          Admin Panel
                        </div>
                      </Link>
                    </>
                  )}
                  {hasRole(role, ['super_admin']) && (
                    <>
                      <Link href="/admin/tenants" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon icon="material-symbols:domain" className="w-5 h-5 text-emerald-500" />
                          Tenant Management
                        </div>
                      </Link>
                      <Link href="/admin/system" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon icon="material-symbols:monitoring" className="w-5 h-5 text-amber-500" />
                          System Dashboard
                        </div>
                      </Link>
                    </>
                  )}
                  
                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <button 
                      onClick={async () => { await signOut(); }}
                      className="block w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Icon icon="material-symbols:logout" className="w-5 h-5" />
                        Sign Out
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link 
                href="/auth/signin" 
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="px-6 py-2 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:opacity-90"
                style={{ background: 'linear-gradient(to right, var(--theme-primary), var(--theme-secondary))' }}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          aria-label="Open Menu"
          className="lg:hidden p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
          onClick={() => setOpen(!open)}
        >
          <Icon icon="material-symbols:menu" className="h-6 w-6" />
        </button>
      </nav>


      {/* Mobile Menu */}
      <div className={`lg:hidden transition-all duration-300 ease-in-out ${
        open ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
      }`}>
        <div className="bg-white border-t border-gray-200 shadow-lg">
          <div className="w-full px-6 py-4 space-y-1">
            {/* Main Navigation */}
            {/* Home */}
            <Link
              href="/"
              className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeMobileClass(pathname === '/')}`}
              style={pathname === '/' ? activeStyle : undefined}
            >
              <div className="flex items-center gap-3">
                <Icon icon="material-symbols:home" className="w-5 h-5" />
                Home
              </div>
            </Link>

            {/* Academics Section */}
            {role !== 'student' && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-4">Academics</div>
                <Link
                  href="/programmes"
                  className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeMobileClass(pathname.startsWith('/programmes'))}`}
                  style={pathname.startsWith('/programmes') ? activeStyle : undefined}
                >
                  <div className="flex items-center gap-3">
                    <Icon icon="material-symbols:school" className="w-5 h-5 text-indigo-500" />
                    Programmes
                  </div>
                </Link>
                <Link
                  href="/courses"
                  className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeMobileClass(pathname.startsWith('/courses'))}`}
                  style={pathname.startsWith('/courses') ? activeStyle : undefined}
                >
                  <div className="flex items-center gap-3">
                    <Icon icon="material-symbols:book" className="w-5 h-5 text-blue-500" />
                    Courses
                  </div>
                </Link>
              </div>
            )}

            {/* Dashboard */}
            {isAuthenticated && (
              <Link
                href="/dashboard"
                className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeMobileClass(pathname.startsWith('/dashboard'))}`}
                style={pathname.startsWith('/dashboard') ? activeStyle : undefined}
              >
                <div className="flex items-center gap-3">
                  <Icon icon="material-symbols:dashboard" className="w-5 h-5" />
                  Dashboard
                </div>
              </Link>
            )}

            {/* Engagement Section */}
            {isAuthenticated && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-4">Engagement</div>
                {hasRole(role, ['instructor', 'admin', 'super_admin']) && (
                  <Link
                    href="/crm"
                    className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeMobileClass(pathname.startsWith('/crm'))}`}
                    style={pathname.startsWith('/crm') ? activeStyle : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <Icon icon="mdi:account-heart" className="w-5 h-5 text-teal-500" />
                      CRM
                    </div>
                  </Link>
                )}
                <Link
                  href="/discussions"
                  className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeMobileClass(pathname.startsWith('/discussions'))}`}
                  style={pathname.startsWith('/discussions') ? activeStyle : undefined}
                >
                  <div className="flex items-center gap-3">
                    <Icon icon="mdi:forum" className="w-5 h-5 text-blue-500" />
                    Discussions
                  </div>
                </Link>
              </div>
            )}

            {isAuthenticated && (
              <>
                {/* Quick Links */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-4">Quick Links</div>

                  <Link
                    href="/my-courses"
                    className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeMobileClass(pathname.startsWith('/my-courses'))}`}
                    style={pathname.startsWith('/my-courses') ? activeStyle : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <Icon icon="material-symbols:school" className="w-5 h-5" />
                      My Courses
                    </div>
                  </Link>

                  <Link
                    href="/messages"
                    className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeMobileClass(pathname.startsWith('/messages'))}`}
                    style={pathname.startsWith('/messages') ? activeStyle : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <Icon icon="mdi:chat" className="w-5 h-5" />
                      Messages
                    </div>
                  </Link>

                  <Link
                    href="/profile"
                    className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeMobileClass(pathname.startsWith('/profile'))}`}
                    style={pathname.startsWith('/profile') ? activeStyle : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <Icon icon="material-symbols:person" className="w-5 h-5" />
                      Profile
                    </div>
                  </Link>
                </div>

                {/* Student Experience Tools - Mobile */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-4">Study Tools</div>

                  <Link
                    href="/student/calendar"
                    className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeMobileClass(pathname.startsWith('/student/calendar'))}`}
                    style={pathname.startsWith('/student/calendar') ? activeStyle : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <Icon icon="mdi:calendar" className="w-5 h-5 text-blue-500" />
                      My Calendar
                    </div>
                  </Link>

                  <Link
                    href="/student/bookmarks"
                    className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeMobileClass(pathname.startsWith('/student/bookmarks'))}`}
                    style={pathname.startsWith('/student/bookmarks') ? activeStyle : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <Icon icon="mdi:bookmark" className="w-5 h-5 text-amber-500" />
                      Bookmarks
                    </div>
                  </Link>

                  <Link
                    href="/student/notes"
                    className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeMobileClass(pathname.startsWith('/student/notes'))}`}
                    style={pathname.startsWith('/student/notes') ? activeStyle : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <Icon icon="mdi:note-text" className="w-5 h-5 text-yellow-500" />
                      My Notes
                    </div>
                  </Link>

                  <Link
                    href="/student/study-groups"
                    className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeMobileClass(pathname.startsWith('/student/study-groups'))}`}
                    style={pathname.startsWith('/student/study-groups') ? activeStyle : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <Icon icon="mdi:account-group" className="w-5 h-5 text-purple-500" />
                      Study Groups
                    </div>
                  </Link>

                  <Link
                    href="/learning-paths"
                    className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeMobileClass(pathname.startsWith('/learning-paths'))}`}
                    style={pathname.startsWith('/learning-paths') ? activeStyle : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <Icon icon="mdi:road-variant" className="w-5 h-5 text-green-500" />
                      Learning Paths
                    </div>
                  </Link>
                </div>

                {canAccessAdmin(role) && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-4">Administration</div>
                    <Link
                      href="/admin/users/manage"
                      className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeMobileClass(pathname.startsWith('/admin/users/manage'))}`}
                      style={pathname.startsWith('/admin/users/manage') ? activeStyle : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <Icon icon="material-symbols:people" className="w-5 h-5" />
                        User Management
                      </div>
                    </Link>
                    <Link
                      href="/admin/courses/manage"
                      className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeMobileClass(pathname.startsWith('/admin/courses/manage'))}`}
                      style={pathname.startsWith('/admin/courses/manage') ? activeStyle : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <Icon icon="material-symbols:school" className="w-5 h-5" />
                        Course Management
                      </div>
                    </Link>
                    <Link
                      href="/admin/tenants"
                      className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeMobileClass(pathname.startsWith('/admin/tenants'))}`}
                      style={pathname.startsWith('/admin/tenants') ? activeStyle : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <Icon icon="material-symbols:account-balance" className="w-5 h-5" />
                        Schools
                      </div>
                    </Link>
                    <Link
                      href="/admin/settings"
                      className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeMobileClass(pathname.startsWith('/admin/settings'))}`}
                      style={pathname.startsWith('/admin/settings') ? activeStyle : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <Icon icon="material-symbols:settings" className="w-5 h-5" />
                        System Settings
                      </div>
                    </Link>
                    <Link
                      href="/surveys"
                      className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeMobileClass(pathname.startsWith('/surveys'))}`}
                      style={pathname.startsWith('/surveys') ? activeStyle : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <Icon icon="material-symbols:poll" className="w-5 h-5 text-teal-500" />
                        Surveys & Evaluations
                      </div>
                    </Link>
                    <Link
                      href="/admin/users"
                      className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeMobileClass(pathname.startsWith('/admin') && !pathname.startsWith('/admin/users/manage') && !pathname.startsWith('/admin/courses/manage') && !pathname.startsWith('/admin/settings') && !pathname.startsWith('/admin/tenants'))}`}
                      style={(pathname.startsWith('/admin') && !pathname.startsWith('/admin/users/manage') && !pathname.startsWith('/admin/courses/manage') && !pathname.startsWith('/admin/settings') && !pathname.startsWith('/admin/tenants')) ? activeStyle : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <Icon icon="material-symbols:admin-panel-settings" className="w-5 h-5" />
                        Admin Panel
                      </div>
                    </Link>
                  </div>
                )}
                {hasRole(role, ['super_admin']) && (
                  <>
                    <Link
                      href="/admin/tenants"
                      className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeMobileClass(pathname.startsWith('/admin/tenants'))}`}
                      style={pathname.startsWith('/admin/tenants') ? activeStyle : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <Icon icon="material-symbols:domain" className="w-5 h-5 text-emerald-500" />
                        Tenant Management
                      </div>
                    </Link>
                    <Link
                      href="/admin/system"
                      className={`block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeMobileClass(pathname.startsWith('/admin/system'))}`}
                      style={pathname.startsWith('/admin/system') ? activeStyle : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <Icon icon="material-symbols:monitoring" className="w-5 h-5 text-amber-500" />
                        System Dashboard
                      </div>
                    </Link>
                  </>
                )}
              </>
            )}

            {/* More Section */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-4">More</div>

              <Link href="/about" className={`block px-4 py-3 rounded-xl transition-colors ${activeMobileClass(pathname.startsWith('/about'))}`}
                style={pathname.startsWith('/about') ? activeStyle : undefined}>
                <div className="flex items-center gap-3">
                  <Icon icon="material-symbols:info" className="w-5 h-5 text-blue-500" />
                  About
                </div>
              </Link>

              <Link href="/contact" className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <Icon icon="material-symbols:contact-mail" className="w-5 h-5 text-purple-500" />
                  Contact
                </div>
              </Link>

              <Link href={role === 'admin' || role === 'super_admin' ? '/help/admin' : role === 'instructor' || role === 'curriculum_designer' ? '/help/instructor' : '/help/student'} className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <Icon icon="material-symbols:help" className="w-5 h-5 text-orange-500" />
                  Help Center
                </div>
              </Link>
            </div>

            {/* Auth Section */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              {loading ? (
                <div className="px-4 py-3 text-center text-gray-500">Loading...</div>
              ) : isAuthenticated ? (
                <div className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {user?.user_metadata?.full_name || 'User'}
                  </div>
                  <div className="text-xs text-gray-500 mb-3">{user?.email}</div>
                  <button 
                    onClick={async () => { await signOut(); }}
                    className="w-full px-4 py-3 bg-red-50 text-red-600 font-medium rounded-xl hover:bg-red-100 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Icon icon="material-symbols:logout" className="w-5 h-5" />
                      Sign Out
                    </div>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 px-4">
                  <Link 
                    href="/auth/signin" 
                    className="block w-full px-4 py-3 text-center text-gray-700 font-medium border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="block w-full px-4 py-3 text-center text-white font-semibold rounded-xl transition-all duration-200 hover:opacity-90"
                    style={{ background: 'linear-gradient(to right, var(--theme-primary), var(--theme-secondary))' }}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
