import SidebarQuickStatsWidget from './SidebarQuickStatsWidget';
import SidebarSystemHealthWidget from './SidebarSystemHealthWidget';
import SidebarNotificationsWidget from './SidebarNotificationsWidget';

interface AdminSidebarProps {
  stats: { label: string; value: number | string; icon: string; color: string }[];
}

export default function AdminSidebar({ stats }: AdminSidebarProps) {
  return (
    <div className="lg:sticky lg:top-24 space-y-4">
      <SidebarQuickStatsWidget stats={stats} />
      <SidebarSystemHealthWidget />
      <SidebarNotificationsWidget />
    </div>
  );
}
