'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useToast } from '@/app/components/ui/Toast';

interface Segment {
  id: string;
  name: string;
  description: string | null;
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

const ACCENT_COLORS = [
  'border-l-violet-400',
  'border-l-blue-400',
  'border-l-emerald-400',
  'border-l-amber-400',
  'border-l-rose-400',
  'border-l-indigo-400',
  'border-l-cyan-400',
  'border-l-pink-400',
];

export default function CRMSegmentsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/crm/segments?limit=100');
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/dashboard');
          return;
        }
        return;
      }
      const data = await res.json();
      setSegments(data.segments || []);
    } catch (error) {
      console.error('CRM Segments: Error', error);
      showToast('Failed to load segments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async (segmentId: string) => {
    try {
      setEvaluatingId(segmentId);
      const res = await fetch(`/api/crm/segments/${segmentId}/evaluate`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSegments(prev =>
          prev.map(s =>
            s.id === segmentId
              ? { ...s, member_count: data.member_count, last_calculated_at: new Date().toISOString() }
              : s
          )
        );
      }
    } catch (error) {
      console.error('CRM Segment Evaluate: Error', error);
      showToast('Failed to evaluate segment', 'error');
    } finally {
      setEvaluatingId(null);
    }
  };

  const handleDelete = async (segmentId: string, name: string) => {
    if (!confirm(`Delete segment "${name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/crm/segments/${segmentId}`, { method: 'DELETE' });
      if (res.ok) {
        setSegments(prev => prev.filter(s => s.id !== segmentId));
      }
    } catch (error) {
      console.error('CRM Segment Delete: Error', error);
      showToast('Failed to delete segment', 'error');
    }
  };

  const filteredSegments = searchTerm
    ? segments.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : segments;

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Skeleton header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-7 w-48 rounded-none bg-gray-200 animate-pulse" />
              <div className="h-5 w-10 rounded bg-gray-100 animate-pulse" />
            </div>
            <div className="h-10 w-36 rounded-none bg-gray-200 animate-pulse" />
          </div>
          {/* Skeleton search */}
          <div className="rounded-none border border-gray-100 bg-white p-4 mb-6 shadow-sm">
            <div className="h-10 w-full rounded-none bg-gray-100 animate-pulse" />
          </div>
          {/* Skeleton cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-none border border-gray-100 bg-white shadow-sm p-5 border-l-4 border-l-gray-200">
                <div className="space-y-3">
                  <div className="h-5 w-3/4 rounded bg-gray-200 animate-pulse" />
                  <div className="h-4 w-full rounded bg-gray-100 animate-pulse" />
                  <div className="flex gap-2">
                    <div className="h-6 w-20 rounded-full bg-gray-100 animate-pulse" />
                    <div className="h-6 w-16 rounded-full bg-gray-100 animate-pulse" />
                  </div>
                  <div className="flex gap-4">
                    <div className="h-4 w-24 rounded bg-gray-100 animate-pulse" />
                    <div className="h-4 w-20 rounded bg-gray-100 animate-pulse" />
                  </div>
                  <div className="border-t border-gray-100 pt-3">
                    <div className="h-8 w-full rounded-none bg-gray-50 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
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
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Student Segments</h1>
            <span className="text-sm text-gray-400 font-medium">({filteredSegments.length})</span>
          </div>
          <Link
            href="/crm/segments/create"
            className="px-5 py-2.5 bg-oecs-navy-blue hover:bg-blue-900 text-white rounded-none transition-all duration-300 text-sm font-semibold flex items-center gap-2 shadow-sm hover:shadow-md"
          >
            <Icon icon="mdi:plus" className="w-4 h-4" />
            New Segment
          </Link>
        </div>

        {/* Search */}
        <div className="bg-white rounded-none border border-gray-100 p-4 mb-6 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="relative">
            <Icon icon="mdi:magnify" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search segments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-none bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none"
            />
          </div>
        </div>

        {/* Segments Grid */}
        {filteredSegments.length === 0 ? (
          <div className="bg-white rounded-none border border-gray-100 p-16 text-center shadow-sm">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-blue-50 flex items-center justify-center">
              <Icon icon="mdi:account-group-outline" className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-gray-900 mb-2">No Segments Yet</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto leading-relaxed">
              Create segments to group students by criteria like risk level, engagement, or lifecycle stage.
            </p>
            <Link
              href="/crm/segments/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-oecs-navy-blue hover:bg-blue-900 text-white rounded-none transition-all duration-300 text-sm font-semibold shadow-sm hover:shadow-md"
            >
              <Icon icon="mdi:plus" className="w-4 h-4" />
              Create Your First Segment
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSegments.map((segment, idx) => (
              <div
                key={segment.id}
                className={`bg-white rounded-none border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 ${ACCENT_COLORS[idx % ACCENT_COLORS.length]} hover:-translate-y-0.5`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/crm/segments/${segment.id}`}
                        className="text-base font-semibold text-gray-900 hover:text-oecs-navy-blue truncate block transition-colors duration-200"
                      >
                        {segment.name}
                      </Link>
                      {segment.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                          {segment.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                      {segment.is_shared && (
                        <span className="text-blue-500" title="Shared">
                          <Icon icon="mdi:share-variant" className="w-4 h-4" />
                        </span>
                      )}
                      {segment.is_dynamic && (
                        <span className="text-amber-500" title="Dynamic">
                          <Icon icon="mdi:refresh" className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Criteria Summary */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(segment.criteria || []).slice(0, 3).map((c: any, i: number) => (
                      <span
                        key={i}
                        className="inline-flex px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                      >
                        {c.field} {c.operator} {Array.isArray(c.value) ? c.value.join(', ') : String(c.value)}
                      </span>
                    ))}
                    {(segment.criteria || []).length > 3 && (
                      <span className="inline-flex px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-500 font-medium">
                        +{segment.criteria.length - 3} more
                      </span>
                    )}
                    {segment.criteria && segment.criteria.length > 1 && (
                      <span className="inline-flex px-2.5 py-1 bg-oecs-navy-blue/10 rounded-full text-xs text-oecs-navy-blue font-semibold">
                        {segment.logic}
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Icon icon="mdi:account-multiple" className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-900">{segment.member_count}</span> members
                    </div>
                    {segment.last_calculated_at && (
                      <div className="flex items-center gap-1.5">
                        <Icon icon="mdi:clock-outline" className="w-4 h-4 text-gray-400" />
                        {new Date(segment.last_calculated_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
                    <Link
                      href={`/crm/segments/${segment.id}`}
                      className="flex-1 px-3 py-1.5 text-center text-sm font-semibold text-oecs-navy-blue hover:bg-blue-50 rounded-none transition-all duration-200"
                    >
                      View Members
                    </Link>
                    <button
                      onClick={() => handleEvaluate(segment.id)}
                      disabled={evaluatingId === segment.id}
                      className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-none transition-all duration-200 disabled:opacity-50"
                      title="Recalculate members"
                    >
                      {evaluatingId === segment.id ? (
                        <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
                      ) : (
                        <Icon icon="mdi:refresh" className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(segment.id, segment.name)}
                      className="px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-none transition-all duration-200"
                      title="Delete segment"
                    >
                      <Icon icon="mdi:delete-outline" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
