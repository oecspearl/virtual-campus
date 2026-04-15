import SidebarTodoWidget from './SidebarTodoWidget';
import SidebarComingUpWidget from './SidebarComingUpWidget';
import SidebarGradesWidget from './SidebarGradesWidget';
import SidebarNotificationsWidget from './SidebarNotificationsWidget';

export default function DashboardSidebar() {
  return (
    <div className="lg:sticky lg:top-24 space-y-4">
      <SidebarTodoWidget />
      <SidebarComingUpWidget />
      <SidebarGradesWidget />
      <SidebarNotificationsWidget />
    </div>
  );
}
