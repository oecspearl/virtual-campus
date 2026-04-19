'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { ToastProvider } from '@/app/components/ui/Toast';
import Breadcrumb from '@/app/components/ui/Breadcrumb';

const NAV_ITEMS = [
  { href: '/crm', label: 'Dashboard', icon: 'mdi:view-dashboard', exact: true },
  { href: '/crm/pipeline', label: 'Pipeline', icon: 'mdi:filter-variant' },
  { href: '/crm/students', label: 'Students', icon: 'mdi:account-group' },
  { href: '/crm/segments', label: 'Segments', icon: 'mdi:chart-pie' },
  { href: '/crm/communications', label: 'Campaigns', icon: 'mdi:email-multiple' },
  { href: '/crm/applications', label: 'Applications', icon: 'mdi:file-document-edit' },
  { href: '/crm/admissions', label: 'Admissions', icon: 'mdi:school' },
  { href: '/crm/tasks', label: 'Tasks', icon: 'mdi:checkbox-marked-circle' },
  { href: '/crm/workflows', label: 'Workflows', icon: 'mdi:sitemap' },
];

function getPageTitle(pathname: string): string {
  if (pathname === '/crm') return 'Dashboard';
  const item = NAV_ITEMS.find(n => !n.exact && pathname.startsWith(n.href));
  return item?.label || 'Dashboard';
}

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  const isActive = (item: typeof NAV_ITEMS[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  const breadcrumbItems =
    pathname === '/crm'
      ? [
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM' },
        ]
      : [
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM', href: '/crm' },
          { label: pageTitle },
        ];

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <Breadcrumb items={breadcrumbItems} className="mb-4" />

          <nav
            className="border-b border-gray-200 mb-6 overflow-x-auto"
            aria-label="CRM sections"
          >
            <ul className="flex items-center gap-1 min-w-max">
              {NAV_ITEMS.map(item => {
                const active = isActive(item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                        active
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon icon={item.icon} className="w-4 h-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {children}
        </div>
      </div>
    </ToastProvider>
  );
}
