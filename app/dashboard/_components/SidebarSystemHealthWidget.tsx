import { Icon } from '@iconify/react';

export default function SidebarSystemHealthWidget() {
  return (
    <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Icon icon="mdi:heart-pulse" className="w-4 h-4 text-green-500" />
          System Health
        </h3>
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
          <div>
            <p className="text-sm font-medium text-gray-900">All Systems Operational</p>
            <p className="text-xs text-gray-400 mt-0.5">Database, API, and services running normally</p>
          </div>
        </div>
      </div>
    </div>
  );
}
