'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useToast } from '@/app/components/ui/Toast';

interface Student {
  student_id: string;
  student_name: string;
  email: string;
  stage: string | null;
  stage_changed_at: string | null;
  risk_level: string | null;
  risk_score: number | null;
}

const STAGE_BADGES: Record<string, { label: string; color: string }> = {
  prospect: { label: 'Prospect', color: 'bg-gray-100 text-gray-700' },
  onboarding: { label: 'Onboarding', color: 'bg-blue-100 text-blue-700' },
  active: { label: 'Active', color: 'bg-green-100 text-green-700' },
  at_risk: { label: 'At Risk', color: 'bg-red-100 text-red-700' },
  re_engagement: { label: 'Re-Engage', color: 'bg-amber-100 text-amber-700' },
  completing: { label: 'Completing', color: 'bg-purple-100 text-purple-700' },
  alumni: { label: 'Alumni', color: 'bg-indigo-100 text-indigo-700' },
};

const RISK_BADGES: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
          <div className="space-y-2">
            <div className="h-4 w-36 bg-gray-200 rounded-none" />
            <div className="h-3 w-48 bg-gray-100 rounded-none" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="h-6 w-20 bg-gray-200 rounded-full" />
      </td>
      <td className="px-6 py-4">
        <div className="h-6 w-24 bg-gray-200 rounded-full" />
      </td>
      <td className="px-6 py-4 text-right">
        <div className="h-4 w-16 bg-gray-200 rounded-none ml-auto" />
      </td>
    </tr>
  );
}

export default function CRMStudentsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [sortField, setSortField] = useState<'name' | 'stage' | 'risk'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search input
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  }, []);

  // Reset page when filters change
  const handleStageChange = useCallback((value: string) => {
    setStageFilter(value);
    setPage(1);
  }, []);

  const handleRiskChange = useCallback((value: string) => {
    setRiskFilter(value);
    setPage(1);
  }, []);

  // Fetch students from API with server-side filtering
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('page', String(page));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (stageFilter) params.set('stage', stageFilter);
      if (riskFilter) params.set('risk_level', riskFilter);

      const res = await fetch(`/api/crm/lifecycle?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          router.push('/dashboard');
          return;
        }
        showToast('Failed to load students', 'error');
        return;
      }
      const data = await res.json();
      setStudents(data.students || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('CRM Students: Error', error);
      showToast('Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, stageFilter, riskFilter, router, showToast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Client-side sort (on current page of data)
  const sortedStudents = [...students].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'name') {
      cmp = a.student_name.localeCompare(b.student_name);
    } else if (sortField === 'stage') {
      cmp = (a.stage || '').localeCompare(b.stage || '');
    } else if (sortField === 'risk') {
      cmp = (a.risk_score || 0) - (b.risk_score || 0);
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (field: 'name' | 'stage' | 'risk') => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const showingStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const showingEnd = Math.min(page * limit, total);

  if (loading && students.length === 0) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Skeleton Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="h-8 w-40 bg-gray-200 rounded-none animate-pulse" />
              <div className="h-6 w-12 bg-gray-100 rounded-full animate-pulse" />
            </div>
          </div>

          {/* Skeleton Filters */}
          <div className="rounded-none border border-gray-100 bg-white p-5 mb-6 shadow-sm">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px] h-11 bg-gray-100 rounded-none animate-pulse" />
              <div className="w-40 h-11 bg-gray-100 rounded-none animate-pulse" />
              <div className="w-40 h-11 bg-gray-100 rounded-none animate-pulse" />
            </div>
          </div>

          {/* Skeleton Table */}
          <div className="rounded-none border border-gray-100 bg-white shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-6 py-4 text-left"><div className="h-3 w-16 bg-gray-200 rounded animate-pulse" /></th>
                  <th className="px-6 py-4 text-left"><div className="h-3 w-12 bg-gray-200 rounded animate-pulse" /></th>
                  <th className="px-6 py-4 text-left"><div className="h-3 w-10 bg-gray-200 rounded animate-pulse" /></th>
                  <th className="px-6 py-4 text-right"><div className="h-3 w-14 bg-gray-200 rounded animate-pulse ml-auto" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">All Students</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-oecs-navy-blue">
              {total}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-none border border-gray-100 p-5 mb-6 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Icon icon="mdi:magnify" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-none bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 text-sm"
              />
            </div>
            <select
              value={stageFilter}
              onChange={(e) => handleStageChange(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-none bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 text-sm"
            >
              <option value="">All Stages</option>
              {Object.entries(STAGE_BADGES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select
              value={riskFilter}
              onChange={(e) => handleRiskChange(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-none bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 text-sm"
            >
              <option value="">All Risk Levels</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-none border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 transition-colors"
                    onClick={() => toggleSort('name')}
                  >
                    Student {sortField === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 transition-colors"
                    onClick={() => toggleSort('stage')}
                  >
                    Stage {sortField === 'stage' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 transition-colors"
                    onClick={() => toggleSort('risk')}
                  >
                    Risk {sortField === 'risk' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))
                ) : sortedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center text-gray-500">
                      <Icon icon="mdi:account-search" className="w-14 h-14 mx-auto mb-4 text-gray-300" />
                      <p className="text-sm">No students found matching your filters.</p>
                    </td>
                  </tr>
                ) : (
                  sortedStudents.map(student => (
                    <tr key={student.student_id} className="hover:bg-blue-50/40 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <Link href={`/crm/students/${student.student_id}`} className="flex items-center gap-3 group">
                          <div className="w-10 h-10 bg-gradient-to-br from-oecs-navy-blue to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm">
                            {student.student_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 group-hover:text-oecs-navy-blue transition-colors">{student.student_name}</div>
                            <div className="text-xs text-gray-500">{student.email}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        {student.stage && STAGE_BADGES[student.stage] ? (
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${STAGE_BADGES[student.stage].color}`}>
                            {STAGE_BADGES[student.stage].label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {student.risk_level ? (
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${RISK_BADGES[student.risk_level] || ''}`}>
                            {student.risk_level} {student.risk_score != null ? `(${student.risk_score})` : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/crm/students/${student.student_id}`}
                          className="text-oecs-navy-blue hover:text-blue-900 text-sm font-semibold transition-colors"
                        >
                          View 360
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Showing {showingStart}-{showingEnd} of {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-none hover:bg-gray-50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 px-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-none hover:bg-gray-50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
