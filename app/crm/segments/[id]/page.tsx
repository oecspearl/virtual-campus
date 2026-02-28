'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useToast } from '@/app/components/ui/Toast';

interface Segment {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_by_name: string | null;
  criteria: any[];
  logic: string;
  member_count: number;
  last_calculated_at: string | null;
  is_dynamic: boolean;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

interface Member {
  student_id: string;
  name: string;
  email: string;
  added_at: string;
}

const OPERATOR_LABELS: Record<string, string> = {
  eq: '=',
  neq: '!=',
  gt: '>',
  lt: '<',
  gte: '>=',
  lte: '<=',
  in: 'in',
  like: 'contains',
};

export default function SegmentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [segment, setSegment] = useState<Segment | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberTotal, setMemberTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  useEffect(() => {
    fetchSegment();
  }, [id, page]);

  const fetchSegment = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/crm/segments/${id}?include_members=true&page=${page}&limit=${limit}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/dashboard');
          return;
        }
        if (res.status === 404) {
          router.push('/crm/segments');
          return;
        }
        return;
      }
      const data = await res.json();
      setSegment(data.segment);
      setMembers(data.members || []);
      setMemberTotal(data.member_total || 0);
    } catch (error) {
      console.error('CRM Segment Detail: Error', error);
      showToast('Failed to load segment details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    try {
      setEvaluating(true);
      const res = await fetch(`/api/crm/segments/${id}/evaluate`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSegment(prev => prev ? { ...prev, member_count: data.member_count, last_calculated_at: new Date().toISOString() } : null);
        // Re-fetch members
        setPage(1);
        fetchSegment();
      }
    } catch (error) {
      console.error('CRM Segment Evaluate: Error', error);
      showToast('Failed to evaluate segment', 'error');
    } finally {
      setEvaluating(false);
    }
  };

  const handleDelete = async () => {
    if (!segment || !confirm(`Delete segment "${segment.name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/crm/segments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/crm/segments');
      }
    } catch (error) {
      console.error('CRM Segment Delete: Error', error);
      showToast('Failed to delete segment', 'error');
    }
  };

  const filteredMembers = searchTerm
    ? members.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : members;

  const totalPages = Math.ceil(memberTotal / limit);

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Skeleton header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div>
                <div className="h-7 w-56 rounded-lg bg-gray-200 animate-pulse" />
                <div className="h-4 w-40 rounded bg-gray-100 animate-pulse mt-2" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-28 rounded-xl bg-gray-200 animate-pulse" />
              <div className="h-10 w-20 rounded-xl bg-gray-200 animate-pulse" />
            </div>
          </div>
          {/* Skeleton info cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 border-t-2 border-t-gray-200">
                <div className="h-4 w-16 rounded bg-gray-100 animate-pulse" />
                <div className="h-8 w-12 rounded bg-gray-200 animate-pulse mt-2" />
              </div>
            ))}
          </div>
          {/* Skeleton criteria */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 mb-6">
            <div className="h-4 w-28 rounded bg-gray-200 animate-pulse mb-3" />
            <div className="flex gap-2">
              <div className="h-8 w-48 rounded-full bg-gray-100 animate-pulse" />
              <div className="h-8 w-36 rounded-full bg-gray-100 animate-pulse" />
            </div>
          </div>
          {/* Skeleton table */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex justify-between">
                <div className="h-5 w-32 rounded bg-gray-200 animate-pulse" />
                <div className="h-8 w-48 rounded-xl bg-gray-100 animate-pulse" />
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-4 px-6 py-3.5">
                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-36 rounded bg-gray-200 animate-pulse" />
                  </div>
                  <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
                  <div className="h-4 w-20 rounded bg-gray-100 animate-pulse" />
                  <div className="h-4 w-16 rounded bg-gray-100 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!segment) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Icon icon="mdi:alert-circle-outline" className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">Segment not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">{segment.name}</h1>
              {segment.description && (
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{segment.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEvaluate}
              disabled={evaluating}
              className="px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition-all duration-200 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              {evaluating ? (
                <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
              ) : (
                <Icon icon="mdi:refresh" className="w-4 h-4" />
              )}
              Recalculate
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 text-sm font-semibold"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Segment Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-300 border-t-2 border-t-blue-500">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Members</div>
            <div className="text-2xl font-bold tracking-tight text-gray-900 mt-1.5">{segment.member_count}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-300 border-t-2 border-t-violet-500">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Criteria</div>
            <div className="text-2xl font-bold tracking-tight text-gray-900 mt-1.5">{(segment.criteria || []).length}</div>
            <div className="text-xs text-gray-400 mt-0.5">Logic: {segment.logic}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-300 border-t-2 border-t-amber-500">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</div>
            <div className="text-2xl font-bold tracking-tight text-gray-900 mt-1.5 flex items-center gap-2">
              {segment.is_dynamic ? (
                <>
                  <Icon icon="mdi:refresh" className="w-5 h-5 text-amber-500" /> Dynamic
                </>
              ) : (
                <>
                  <Icon icon="mdi:pin" className="w-5 h-5 text-gray-400" /> Static
                </>
              )}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-300 border-t-2 border-t-emerald-500">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Calculated</div>
            <div className="text-sm font-semibold text-gray-900 mt-2.5">
              {segment.last_calculated_at
                ? new Date(segment.last_calculated_at).toLocaleString()
                : 'Never'}
            </div>
          </div>
        </div>

        {/* Criteria Display */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm hover:shadow-md transition-all duration-300">
          <h2 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Filter Criteria</h2>
          <div className="flex flex-wrap gap-2">
            {(segment.criteria || []).map((c: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span className="text-xs font-bold text-oecs-navy-blue px-1">
                    {segment.logic}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 rounded-xl text-sm border border-blue-100">
                  <span className="font-semibold text-blue-700">
                    {c.field.replace(/_/g, ' ')}
                  </span>
                  <span className="text-gray-400">
                    {OPERATOR_LABELS[c.operator] || c.operator}
                  </span>
                  <span className="font-semibold text-oecs-navy-blue">
                    {Array.isArray(c.value) ? c.value.join(', ') : String(c.value)}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3.5 text-xs text-gray-400">
            Created by {segment.created_by_name || 'Unknown'} on {new Date(segment.created_at).toLocaleDateString()}
            {segment.is_shared && ' | Shared with all staff'}
          </div>
        </div>

        {/* Members Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold tracking-tight text-gray-900">
                Members <span className="text-gray-400 font-medium">({memberTotal})</span>
              </h2>
              <div className="relative w-64">
                <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Added
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                        <Icon icon="mdi:account-group-outline" className="w-8 h-8 text-blue-400" />
                      </div>
                      <p className="text-gray-500 font-medium">
                        {searchTerm ? 'No members match your search.' : 'No members yet. Click "Recalculate" to evaluate criteria.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map(member => (
                    <tr key={member.student_id} className="hover:bg-gray-50/60 transition-colors duration-150">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-oecs-navy-blue to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{member.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-gray-500">{member.email}</td>
                      <td className="px-6 py-3.5 text-sm text-gray-500">
                        {new Date(member.added_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Link
                          href={`/crm/students/${member.student_id}`}
                          className="text-oecs-navy-blue hover:text-blue-900 text-sm font-semibold transition-colors duration-200"
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
          {totalPages > 1 && (
            <div className="px-6 py-3.5 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-400 font-medium">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-1.5 text-sm font-semibold border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-1.5 text-sm font-semibold border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
