'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import AIChatWidget from '@/app/components/ai/AIChatWidget';
import AIHelpEnhancement from '@/app/components/ai/AIHelpEnhancement';
import type { HelpSection } from './types';

interface HelpPageShellProps {
  pageTitle: string;
  helpHomeHref: string;
  breadcrumbLabel: string;
  userRole: string;
  currentPagePath: string;
  defaultSectionId: string;
  sections: HelpSection[];
  groupOrder: string[];
  fallbackAiPrompt?: string;
}

export default function HelpPageShell({
  pageTitle,
  helpHomeHref,
  breadcrumbLabel,
  userRole,
  currentPagePath,
  defaultSectionId,
  sections,
  groupOrder,
  fallbackAiPrompt = 'How do I get started?',
}: HelpPageShellProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string>(defaultSectionId);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiInitialMessage, setAiInitialMessage] = useState('');
  const [aiMessageKey, setAiMessageKey] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const q = searchQuery.trim().toLowerCase();
  const filteredSections = useMemo(() => {
    if (!q) return sections;
    return sections.filter((s) => {
      const haystack = `${s.title} ${s.description} ${s.searchText}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [q, sections]);

  const groupedSections = useMemo(() => {
    const map = new Map<string, HelpSection[]>();
    for (const s of filteredSections) {
      if (!map.has(s.group)) map.set(s.group, []);
      map.get(s.group)!.push(s);
    }
    return groupOrder
      .filter((g) => map.has(g))
      .map((g) => ({ group: g, items: map.get(g)! }));
  }, [filteredSections, groupOrder]);

  const currentSection = sections.find((s) => s.id === activeSection) ?? sections[0];

  const selectSection = (id: string) => {
    setActiveSection(id);
    setMobileNavOpen(false);
    if (contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleAISearch = (query: string) => {
    setAiInitialMessage(query || '');
    setAiMessageKey((k) => k + 1);
    setShowAIChat(true);
  };

  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [mobileNavOpen]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href={helpHomeHref}
            className="flex items-center gap-2 text-slate-900 transition-colors hover:text-blue-600"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Icon icon="mdi:lifebuoy" className="h-5 w-5" />
            </span>
            <span className="font-semibold tracking-tight">{pageTitle}</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <Icon icon="mdi:arrow-left" className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-5 flex items-center gap-1.5 text-sm text-slate-500"
        >
          <Link href="/" className="cursor-pointer hover:text-slate-700">
            Home
          </Link>
          <Icon icon="mdi:chevron-right" className="h-4 w-4 text-slate-400" />
          <Link href={helpHomeHref} className="cursor-pointer hover:text-slate-700">
            Help
          </Link>
          <Icon icon="mdi:chevron-right" className="h-4 w-4 text-slate-400" />
          <span className="font-medium text-slate-900">{breadcrumbLabel}</span>
          {currentSection && (
            <>
              <Icon icon="mdi:chevron-right" className="h-4 w-4 text-slate-400" />
              <span className="truncate text-slate-700">{currentSection.title}</span>
            </>
          )}
        </nav>

        {/* Mobile topic picker */}
        <div className="mb-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            aria-expanded={mobileNavOpen}
          >
            <span className="flex items-center gap-2">
              <Icon icon={currentSection.icon} className="h-5 w-5 text-slate-500" />
              <span>{currentSection.title}</span>
            </span>
            <Icon icon="mdi:menu" className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          <Sidebar
            groupedSections={groupedSections}
            activeSection={activeSection}
            onSelect={selectSection}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onAskAI={handleAISearch}
            totalCount={sections.length}
            filteredCount={filteredSections.length}
            mobileOpen={mobileNavOpen}
            onCloseMobile={() => setMobileNavOpen(false)}
            fallbackAiPrompt={fallbackAiPrompt}
          />

          <main className="min-w-0 flex-1">
            <article
              ref={contentRef}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10"
            >
              <AIHelpEnhancement
                onAISearch={handleAISearch}
                currentPage={currentPagePath}
                userRole={userRole}
                activeSection={activeSection}
              />

              <header className="mb-6 border-b border-slate-200 pb-6 sm:mb-8 sm:pb-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Icon icon={currentSection.icon} className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                      {currentSection.title}
                    </h1>
                    <p className="mt-2 text-sm text-slate-600 sm:text-base">
                      {currentSection.description}
                    </p>
                  </div>
                </div>
              </header>

              <div>{currentSection.content}</div>

              <footer className="mt-10 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Icon
                    icon="mdi:robot-happy-outline"
                    className="h-5 w-5 flex-shrink-0 text-blue-600"
                  />
                  <div>
                    <p className="font-medium text-slate-900">Still have questions?</p>
                    <p className="text-sm text-slate-600">
                      Ask the AI assistant for personalised help on this topic.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAISearch(`Tell me more about: ${currentSection.title}`)}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Icon icon="mdi:chat-question-outline" className="h-4 w-4" />
                  Ask the AI assistant
                </button>
              </footer>
            </article>
          </main>
        </div>
      </div>

      {showAIChat && (
        <AIChatWidget
          key={aiMessageKey}
          currentPage={currentPagePath}
          context={{ userRole, activeSection }}
          initialMessage={aiInitialMessage}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------

interface SidebarProps {
  groupedSections: { group: string; items: HelpSection[] }[];
  activeSection: string;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAskAI: (q: string) => void;
  totalCount: number;
  filteredCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  fallbackAiPrompt: string;
}

function Sidebar({
  groupedSections,
  activeSection,
  onSelect,
  searchQuery,
  onSearchChange,
  onAskAI,
  totalCount,
  filteredCount,
  mobileOpen,
  onCloseMobile,
  fallbackAiPrompt,
}: SidebarProps) {
  const navContent = (
    <>
      <div className="border-b border-slate-200 p-4">
        <label htmlFor="help-search" className="sr-only">
          Search help topics
        </label>
        <div className="relative">
          <Icon
            icon="mdi:magnify"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            id="help-search"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search help topics…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <Icon icon="mdi:close" className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>
            {searchQuery
              ? `${filteredCount} of ${totalCount} topics`
              : `${totalCount} topics`}
          </span>
          <button
            type="button"
            onClick={() => onAskAI(searchQuery || fallbackAiPrompt)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-blue-600 hover:bg-blue-50"
          >
            <Icon icon="mdi:robot-outline" className="h-3.5 w-3.5" />
            Ask AI
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2" aria-label="Help topics">
        {groupedSections.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-slate-500">
            <Icon
              icon="mdi:text-search-variant"
              className="mx-auto mb-2 h-8 w-8 text-slate-300"
            />
            <p>No topics match &ldquo;{searchQuery}&rdquo;.</p>
            <button
              type="button"
              onClick={() => onAskAI(searchQuery)}
              className="mt-2 inline-flex cursor-pointer items-center gap-1 text-blue-600 hover:underline"
            >
              <Icon icon="mdi:robot-outline" className="h-3.5 w-3.5" />
              Ask AI instead
            </button>
          </div>
        )}

        {groupedSections.map(({ group, items }) => (
          <div key={group} className="mb-4">
            <div className="px-3 pb-1.5 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {group}
            </div>
            <ul className="space-y-0.5">
              {items.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(section.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={[
                        'group relative flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                        isActive
                          ? 'bg-blue-50 font-semibold text-blue-700'
                          : 'text-slate-700 hover:bg-slate-100',
                      ].join(' ')}
                    >
                      {isActive && (
                        <span
                          aria-hidden
                          className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-blue-600"
                        />
                      )}
                      <Icon
                        icon={section.icon}
                        className={[
                          'h-4 w-4 flex-shrink-0 transition-colors',
                          isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600',
                        ].join(' ')}
                      />
                      <span className="min-w-0 flex-1 truncate">{section.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );

  return (
    <>
      <aside className="hidden lg:block lg:w-72 lg:flex-shrink-0">
        <div className="sticky top-20 flex max-h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {navContent}
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close topics"
            onClick={onCloseMobile}
            className="absolute inset-0 cursor-pointer bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="font-semibold text-slate-900">Help topics</h2>
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close"
                className="cursor-pointer rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <Icon icon="mdi:close" className="h-5 w-5" />
              </button>
            </div>
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
