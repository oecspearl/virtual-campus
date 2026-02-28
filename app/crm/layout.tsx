'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { ToastProvider } from '@/app/components/ui/Toast';

const NAV_ITEMS = [
  { href: '/crm', label: 'Dashboard', icon: 'mdi:view-dashboard', exact: true },
  { href: '/crm/pipeline', label: 'Pipeline', icon: 'mdi:view-column' },
  { href: '/crm/students', label: 'Students', icon: 'mdi:account-group' },
  { href: '/crm/segments', label: 'Segments', icon: 'mdi:account-multiple-check' },
  { href: '/crm/communications', label: 'Campaigns', icon: 'mdi:email-multiple' },
  { href: '/crm/applications', label: 'Applications', icon: 'mdi:clipboard-text-outline' },
  { href: '/crm/admissions', label: 'Admissions', icon: 'mdi:school-outline' },
  { href: '/crm/tasks', label: 'Tasks', icon: 'mdi:clipboard-check' },
  { href: '/crm/workflows', label: 'Workflows', icon: 'mdi:robot' },
];

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (item: typeof NAV_ITEMS[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <ToastProvider>
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-gray-200/80 bg-white/80 backdrop-blur-sm transition-all duration-300 flex-shrink-0 ${
          collapsed ? 'w-[68px]' : 'w-56'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-oecs-navy-blue rounded-none flex items-center justify-center">
                <Icon icon="mdi:account-heart" className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-sm font-bold text-gray-900 tracking-tight">Student CRM</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-7 h-7 rounded-none hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <Icon icon={collapsed ? 'mdi:chevron-right' : 'mdi:chevron-left'} className="w-4 h-4" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-3 space-y-1">
          {NAV_ITEMS.map(item => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-none text-sm font-medium transition-all duration-200 group ${
                  active
                    ? 'bg-oecs-navy-blue text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon
                  icon={item.icon}
                  className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`}
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        {!collapsed && (
          <div className="px-4 py-3 border-t border-gray-100">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 text-xs text-gray-400 hover:text-gray-600 transition-colors font-medium"
            >
              <Icon icon="mdi:arrow-left" className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
    </ToastProvider>
  );
}
