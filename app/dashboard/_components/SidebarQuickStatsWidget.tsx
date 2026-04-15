import { Icon } from '@iconify/react';

interface StatItem {
  label: string;
  value: number | string;
  icon: string;
  color: string;
}

interface SidebarQuickStatsWidgetProps {
  stats: StatItem[];
}

export default function SidebarQuickStatsWidget({ stats }: SidebarQuickStatsWidgetProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Icon icon="mdi:chart-box-outline" className="w-4 h-4 text-blue-500" />
          Quick Stats
        </h3>
      </div>
      <div className="divide-y divide-gray-50">
        {stats.map((stat, idx) => (
          <div key={idx} className="px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <Icon icon={stat.icon} className="w-3.5 h-3.5" style={{ color: stat.color }} />
              </div>
              <span className="text-sm text-gray-600">{stat.label}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
