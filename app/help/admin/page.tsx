'use client';

import HelpPageShell from '@/app/help/_components/HelpPageShell';
import { adminHelpSections, sectionGroupOrder } from './sections';

export default function AdminHelpPage() {
  return (
    <HelpPageShell
      pageTitle="Admin Help Center"
      helpHomeHref="/help/admin"
      breadcrumbLabel="Admin"
      userRole="admin"
      currentPagePath="/help/admin"
      defaultSectionId="getting-started"
      sections={adminHelpSections}
      groupOrder={sectionGroupOrder}
      fallbackAiPrompt="How do I get started as an admin?"
    />
  );
}
