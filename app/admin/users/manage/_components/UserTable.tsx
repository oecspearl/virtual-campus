'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface School { id: string; name: string; }
interface User {
  id: string; email: string; name: string; role: string;
  created_at: string; last_login: string | null; school_id: string | null;
}

export type SortField = 'name' | 'email' | 'role' | 'created_at' | 'last_login';

type UserTableAction =
  | { type: 'editProfile'; userId: string }
  | { type: 'sendWelcomeEmail'; userId: string; userName: string }
  | { type: 'delete'; userId: string; userName: string };

interface UserTableProps {
  users: User[];
  totalCount: number;
  selectedUsers: Set<string>;
  onToggleSelection: (userId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  onSort: (field: SortField) => void;
  onAction: (action: UserTableAction) => void;
  schools: School[];
  hasFilters: boolean;
}

const PAGE_SIZE = 50;

function SortHeader({ field, label, sortField, sortDirection, onSort }: {
  field: SortField; label: string; sortField: SortField; sortDirection: 'asc' | 'desc'; onSort: (f: SortField) => void;
}) {
  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field
          ? <Icon icon={sortDirection === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'} className="w-3.5 h-3.5" />
          : <Icon icon="mdi:unfold-more-horizontal" className="w-3.5 h-3.5 text-gray-300" />}
      </div>
    </th>
  );
}

function RoleBadge({ role }: { role: string }) {
  const cls = role === 'admin' || role === 'super_admin'
    ? 'bg-red-100 text-red-800'
    : role === 'instructor' || role === 'curriculum_designer'
    ? 'bg-blue-100 text-blue-800'
    : 'bg-green-100 text-green-800';
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${cls}`}>
      {role.replace('_', ' ')}
    </span>
  );
}

export default function UserTable({
  users, totalCount, selectedUsers, onToggleSelection, onSelectAll, onClearSelection,
  sortField, sortDirection, onSort, onAction, schools, hasFilters,
}: UserTableProps) {
  const [page, setPage] = useState(1);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [users.length, hasFilters]);

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const end = Math.min(page * PAGE_SIZE, users.length);
  const pageUsers = users.slice(start, end);

  const allOnPageSelected = pageUsers.length > 0 && pageUsers.every(u => selectedUsers.has(u.id));

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          {hasFilters ? `${users.length} of ${totalCount} users` : `${totalCount} users`}
        </h2>
        {selectedUsers.size > 0 && (
          <span className="text-xs text-blue-600 font-medium">{selectedUsers.size} selected</span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      // Select all on current page
                      pageUsers.forEach(u => {
                        if (!selectedUsers.has(u.id)) onToggleSelection(u.id);
                      });
                    } else {
                      // Deselect all on current page
                      pageUsers.forEach(u => {
                        if (selectedUsers.has(u.id)) onToggleSelection(u.id);
                      });
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <SortHeader field="name" label="Name" sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
              <SortHeader field="email" label="Email" sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
              <SortHeader field="role" label="Role" sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
              <SortHeader field="created_at" label="Created" sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
              <SortHeader field="last_login" label="Last Login" sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pageUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  {hasFilters ? 'No users match your filters.' : 'No users found.'}
                </td>
              </tr>
            ) : (
              pageUsers.map((user) => (
                <tr key={user.id} className={`hover:bg-gray-50 ${selectedUsers.has(user.id) ? 'bg-blue-50/50' : ''}`}>
                  <td className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={() => onToggleSelection(user.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><RoleBadge role={user.role} /></td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {user.school_id ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-cyan-50 text-cyan-700">
                        <Icon icon="material-symbols:account-balance" className="w-3 h-3" />
                        {schools.find(s => s.id === user.school_id)?.name || 'Unknown'}
                      </span>
                    ) : <span className="text-gray-300">&mdash;</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {user.last_login ? (
                      <span title={new Date(user.last_login).toLocaleString()}>
                        {new Date(user.last_login).toLocaleDateString()}
                      </span>
                    ) : <span className="text-gray-300 italic">Never</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onAction({ type: 'editProfile', userId: user.id })}
                        className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit profile"
                      >
                        <Icon icon="material-symbols:edit-outline" className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onAction({ type: 'sendWelcomeEmail', userId: user.id, userName: user.name })}
                        className="p-1.5 rounded-md text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                        title="Send welcome email"
                      >
                        <Icon icon="material-symbols:mail-outline" className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onAction({ type: 'delete', userId: user.id, userName: user.name })}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete user"
                      >
                        <Icon icon="material-symbols:delete-outline" className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {users.length > PAGE_SIZE && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <span className="text-sm text-gray-500">
            Showing {start + 1}&ndash;{end} of {users.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
