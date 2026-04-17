'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import AdminToolCard from './AdminToolCard';
import AdminToolListItem from './AdminToolListItem';

interface Tool {
  icon: string;
  label: string;
  description: string;
  href: string;
  color: string;
}

interface ToolGroup {
  title: string;
  tools: Tool[];
}

type ViewMode = 'card' | 'list';
type SortOrder = 'default' | 'asc' | 'desc';
type GroupMode = 'grouped' | 'ungrouped';

export default function AdminToolsView({ groups }: { groups: ToolGroup[] }) {
  const [view, setView] = useState<ViewMode>('card');
  const [sort, setSort] = useState<SortOrder>('default');
  const [groupMode, setGroupMode] = useState<GroupMode>('grouped');

  const cycleSortOrder = () => {
    setSort(prev => {
      if (prev === 'default') return 'asc';
      if (prev === 'asc') return 'desc';
      return 'default';
    });
  };

  const sortTools = (tools: Tool[]) => {
    if (sort === 'default') return tools;
    return [...tools].sort((a, b) => {
      const cmp = a.label.localeCompare(b.label);
      return sort === 'asc' ? cmp : -cmp;
    });
  };

  const sortLabel = sort === 'default' ? 'A-Z' : sort === 'asc' ? 'A-Z' : 'Z-A';
  const sortIcon = sort === 'default' ? 'mdi:sort-alphabetical-ascending' : sort === 'asc' ? 'mdi:sort-alphabetical-ascending' : 'mdi:sort-alphabetical-descending';

  // Flatten all tools for ungrouped view
  const allToolsSorted = sortTools(groups.flatMap(g => g.tools));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('card')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer ${
              view === 'card'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon icon="mdi:view-grid" className="w-4 h-4" />
            Cards
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer ${
              view === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon icon="mdi:view-list" className="w-4 h-4" />
            List
          </button>
        </div>

        {view === 'list' && (
          <div className="flex items-center gap-2">
            <button
              onClick={cycleSortOrder}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 cursor-pointer ${
                sort !== 'default'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Icon icon={sortIcon} className="w-4 h-4" />
              {sortLabel}
            </button>
            <button
              onClick={() => setGroupMode(prev => prev === 'grouped' ? 'ungrouped' : 'grouped')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 cursor-pointer ${
                groupMode === 'ungrouped'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Icon icon={groupMode === 'grouped' ? 'mdi:group' : 'mdi:ungroup'} className="w-4 h-4" />
              {groupMode === 'grouped' ? 'Grouped' : 'Ungrouped'}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {view === 'card' ? (
        // Card View — always grouped
        groups.map(group => (
          <div key={group.title}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{group.title}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {group.tools.map(tool => (
                <AdminToolCard
                  key={tool.href}
                  icon={tool.icon}
                  label={tool.label}
                  description={tool.description}
                  href={tool.href}
                  color={tool.color}
                />
              ))}
            </div>
          </div>
        ))
      ) : groupMode === 'grouped' ? (
        // List View — Grouped
        groups.map(group => (
          <div key={group.title}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{group.title}</h2>
            <div className="space-y-2">
              {sortTools(group.tools).map(tool => (
                <AdminToolListItem
                  key={tool.href}
                  icon={tool.icon}
                  label={tool.label}
                  description={tool.description}
                  href={tool.href}
                  color={tool.color}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        // List View — Ungrouped (flat list)
        <div className="space-y-2">
          {allToolsSorted.map(tool => (
            <AdminToolListItem
              key={tool.href}
              icon={tool.icon}
              label={tool.label}
              description={tool.description}
              href={tool.href}
              color={tool.color}
            />
          ))}
        </div>
      )}
    </div>
  );
}
