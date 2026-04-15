'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ToastProvider } from '@/app/components/ui/Toast';

const NAV_ITEMS = [
  { href: '/crm', label: 'Dashboard', exact: true },
  { href: '/crm/pipeline', label: 'Pipeline' },
  { href: '/crm/students', label: 'Students' },
  { href: '/crm/segments', label: 'Segments' },
  { href: '/crm/communications', label: 'Campaigns' },
  { href: '/crm/applications', label: 'Applications' },
  { href: '/crm/admissions', label: 'Admissions' },
  { href: '/crm/tasks', label: 'Tasks' },
  { href: '/crm/workflows', label: 'Workflows' },
];

function getPageTitle(pathname: string): string {
  if (pathname === '/crm') return 'Dashboard';
  const item = NAV_ITEMS.find(n => !n.exact && pathname.startsWith(n.href));
  return item?.label || 'Dashboard';
}

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const pageTitle = getPageTitle(pathname);

  const isActive = (item: typeof NAV_ITEMS[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-gray-50/50">
        {/* SIDEBAR */}
        <aside
          className="relative z-10 flex flex-col overflow-hidden transition-all duration-200 ease-in-out"
          style={{
            width: collapsed ? 56 : 210,
            minWidth: collapsed ? 56 : 210,
            background: 'var(--theme-primary)',
          }}
        >
          {/* Sidebar Header */}
          <div className="flex items-center gap-2.5 px-3.5 py-4 border-b border-white/10" style={{ minHeight: 64 }}>
            <div
              className="w-7 h-7 flex-shrink-0 flex items-center justify-center text-white text-[11px] font-medium tracking-wide rounded"
              style={{ background: 'var(--theme-secondary)' }}
            >
              CRM
            </div>
            {!collapsed && (
              <div>
                <div className="text-xs font-semibold text-white/90 tracking-widest uppercase whitespace-nowrap">
                  Student CRM
                </div>
                <div className="text-[10px] text-white/40 tracking-wide whitespace-nowrap">
                  Student Engagement
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute flex items-center justify-center text-white/50 hover:text-white text-[10px] cursor-pointer transition-colors duration-200"
            style={{
              right: -1,
              top: 68,
              width: 18,
              height: 32,
              background: 'color-mix(in srgb, var(--theme-primary) 70%, white)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderLeft: 'none',
            }}
          >
            {collapsed ? '›' : '‹'}
          </button>

          {/* Nav */}
          <nav className="flex-1 py-2 overflow-hidden">
            {NAV_ITEMS.map(item => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3.5 h-[38px] relative whitespace-nowrap overflow-hidden no-underline transition-colors duration-200 ${
                    active ? 'bg-white/15' : 'hover:bg-white/[0.06]'
                  }`}
                >
                  {active && (
                    <div
                      className="absolute left-0 top-1.5 bottom-1.5 w-0.5"
                      style={{ background: 'var(--theme-accent, var(--theme-secondary))' }}
                    />
                  )}
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-200"
                    style={{
                      background: active
                        ? 'var(--theme-accent, var(--theme-secondary))'
                        : 'rgba(255,255,255,0.25)',
                    }}
                  />
                  <span
                    className={`text-[12.5px] tracking-wide transition-all duration-200 ${
                      active ? 'text-white font-medium' : 'text-white/60'
                    } ${collapsed ? 'opacity-0' : 'opacity-100'}`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <Link
            href="/dashboard"
            className={`block px-3.5 py-3 border-t border-white/10 text-[10.5px] text-white/30 tracking-wide whitespace-nowrap overflow-hidden no-underline hover:text-white/50 transition-all duration-200 ${
              collapsed ? 'opacity-0' : 'opacity-100'
            }`}
          >
            ← Back to Dashboard
          </Link>
        </aside>

        {/* MAIN */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Topbar */}
          <div
            className="h-16 flex items-center px-7 gap-4 flex-shrink-0 border-b border-white/10"
            style={{ background: 'var(--theme-primary)' }}
          >
            <span className="text-[11px] text-white/40 tracking-widest uppercase font-mono">
              CRM
            </span>
            <span className="text-white/20 text-base">/</span>
            <span className="text-xl text-white font-display">
              {pageTitle}
            </span>
            <div className="ml-auto flex items-center gap-5">
              <span className="text-[11px] text-white/35 font-mono">
                AY 2025–26 · Term 2
              </span>
              <span
                className="text-[10px] font-semibold text-white px-2 py-0.5 tracking-widest uppercase rounded-sm"
                style={{ background: 'var(--theme-secondary)' }}
              >
                Live
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-7">
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
