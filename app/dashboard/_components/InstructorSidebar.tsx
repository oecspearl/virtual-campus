import SidebarNeedsGradingWidget from './SidebarNeedsGradingWidget';
import SidebarNotificationsWidget from './SidebarNotificationsWidget';

export default function InstructorSidebar() {
  return (
    <div className="lg:sticky lg:top-24 space-y-4">
      <SidebarNeedsGradingWidget />
      <SidebarNotificationsWidget />
    </div>
  );
}
