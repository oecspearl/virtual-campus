'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import LoadingIndicator from '@/app/components/ui/LoadingIndicator';

interface GradeConfig {
  id: string;
  course_id: string;
  enabled: boolean;
  sync_mode: string;
  grade_format: string;
  sonisweb_course_code: string | null;
  sonisweb_section: string | null;
  grade_items: GradeSyncItem[];
  last_passback_at: string | null;
  last_passback_status: string | null;
}

interface GradeSyncItem {
  grade_item_id: string;
  sonisweb_column: string;
  enabled: boolean;
}

interface Course {
  id: string;
  title: string;
}

interface GradeItem {
  id: string;
  title: string;
  type: string;
  points: number;
}

export default function GradeSyncConfigPage() {
  const params = useParams();
  const connectionId = params.id as string;

  const [configs, setConfigs] = useState<GradeConfig[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [courseGradeItems, setCourseGradeItems] = useState<Record<string, GradeItem[]>>({});
  const [pushing, setPushing] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [connectionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [configRes, coursesRes] = await Promise.all([
        fetch(`/api/sonisweb/grades/config?connection_id=${connectionId}`),
        fetch('/api/courses?limit=100'),
      ]);

      if (configRes.ok) setConfigs(await configRes.json());
      if (coursesRes.ok) {
        const data = await coursesRes.json();
        setCourses(Array.isArray(data) ? data : data.courses || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadGradeItems = async (courseId: string) => {
    if (courseGradeItems[courseId]) return;
    const res = await fetch(`/api/courses/${courseId}/grade-items`);
    if (res.ok) {
      const items = await res.json();
      setCourseGradeItems(prev => ({ ...prev, [courseId]: items }));
    }
  };

  const handleToggleCourse = async (courseId: string, enabled: boolean) => {
    const existing = configs.find(c => c.course_id === courseId);
    await fetch('/api/sonisweb/grades/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connection_id: connectionId,
        course_id: courseId,
        enabled,
        sync_mode: existing?.sync_mode || 'manual',
        grade_format: existing?.grade_format || 'percentage',
        sonisweb_course_code: existing?.sonisweb_course_code || '',
        grade_items: existing?.grade_items || [],
      }),
    });
    loadData();
  };

  const handleSaveConfig = async (courseId: string, updates: Partial<GradeConfig>) => {
    const existing = configs.find(c => c.course_id === courseId);
    await fetch('/api/sonisweb/grades/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connection_id: connectionId,
        course_id: courseId,
        ...existing,
        ...updates,
      }),
    });
    loadData();
  };

  const handlePushGrades = async (courseId: string) => {
    setPushing(courseId);
    try {
      const res = await fetch('/api/sonisweb/sync/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: connectionId, course_id: courseId }),
      });
      const data = await res.json();
      alert(`Grade passback ${data.status}: ${data.records_updated} updated, ${data.records_failed} failed`);
      loadData();
    } catch {
      alert('Grade passback failed');
    } finally {
      setPushing(null);
    }
  };

  const toggleExpand = (courseId: string) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
    } else {
      setExpandedCourse(courseId);
      loadGradeItems(courseId);
    }
  };

  if (loading) return <div className="p-6"><LoadingIndicator variant="books" text="Loading grade config..." fullCenter /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <a href={`/admin/sonisweb/${connectionId}`} className="text-gray-400 hover:text-gray-600">
          <Icon icon="mdi:arrow-left" className="text-xl" />
        </a>
        <div>
          <h1 className="text-2xl font-bold">Grade Passback Configuration</h1>
          <p className="text-gray-500 text-sm">Configure which course grades sync to SonisWeb</p>
        </div>
      </div>

      <div className="space-y-3">
        {courses.map(course => {
          const config = configs.find(c => c.course_id === course.id);
          const isEnabled = config?.enabled || false;
          const isExpanded = expandedCourse === course.id;
          const items = courseGradeItems[course.id] || [];

          return (
            <div key={course.id} className="bg-white rounded-lg border">
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleExpand(course.id)}>
                  <Icon icon={isExpanded ? 'mdi:chevron-down' : 'mdi:chevron-right'} className="text-gray-400" />
                  <span className="font-medium">{course.title}</span>
                  {config?.last_passback_status && (
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      config.last_passback_status === 'success' ? 'bg-green-100 text-green-700' :
                      config.last_passback_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {config.last_passback_status}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isEnabled && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handlePushGrades(course.id)}
                      disabled={pushing === course.id}
                    >
                      <Icon icon={pushing === course.id ? 'mdi:loading' : 'mdi:upload'} className={pushing === course.id ? 'animate-spin mr-1' : 'mr-1'} />
                      Push
                    </Button>
                  )}
                  <button
                    onClick={() => handleToggleCourse(course.id, !isEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t px-5 py-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <Input
                      label="SonisWeb Course Code"
                      value={config?.sonisweb_course_code || ''}
                      onChange={(e) => handleSaveConfig(course.id, { sonisweb_course_code: e.target.value })}
                      placeholder="e.g., ENG101"
                    />
                    <Input
                      label="SonisWeb Section"
                      value={config?.sonisweb_section || ''}
                      onChange={(e) => handleSaveConfig(course.id, { sonisweb_section: e.target.value })}
                      placeholder="e.g., 01"
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Grade Format</label>
                      <select
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        value={config?.grade_format || 'percentage'}
                        onChange={(e) => handleSaveConfig(course.id, { grade_format: e.target.value })}
                      >
                        <option value="percentage">Percentage</option>
                        <option value="points">Points (score/max)</option>
                        <option value="letter">Letter Grade</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sync Mode</label>
                    <select
                      className="w-full max-w-xs border rounded-lg px-3 py-2 text-sm mb-4"
                      value={config?.sync_mode || 'manual'}
                      onChange={(e) => handleSaveConfig(course.id, { sync_mode: e.target.value })}
                    >
                      <option value="manual">Manual (push button)</option>
                      <option value="auto">Auto (on grade save)</option>
                      <option value="scheduled">Scheduled (with cron)</option>
                    </select>
                  </div>

                  {items.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Grade Items</h4>
                      <div className="space-y-2">
                        {items.map(item => {
                          const syncItem = (config?.grade_items || []).find((g: GradeSyncItem) => g.grade_item_id === item.id);
                          return (
                            <div key={item.id} className="flex items-center justify-between bg-white rounded border px-3 py-2">
                              <div>
                                <span className="text-sm font-medium">{item.title}</span>
                                <span className="text-xs text-gray-400 ml-2">({item.type}, {item.points} pts)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="SonisWeb column"
                                  value={syncItem?.sonisweb_column || ''}
                                  onChange={(e) => {
                                    const newItems = [...(config?.grade_items || [])];
                                    const idx = newItems.findIndex((g: GradeSyncItem) => g.grade_item_id === item.id);
                                    if (idx >= 0) {
                                      newItems[idx] = { ...newItems[idx], sonisweb_column: e.target.value };
                                    } else {
                                      newItems.push({ grade_item_id: item.id, sonisweb_column: e.target.value, enabled: true });
                                    }
                                    handleSaveConfig(course.id, { grade_items: newItems });
                                  }}
                                />
                                <input
                                  type="checkbox"
                                  checked={syncItem?.enabled || false}
                                  onChange={(e) => {
                                    const newItems = [...(config?.grade_items || [])];
                                    const idx = newItems.findIndex((g: GradeSyncItem) => g.grade_item_id === item.id);
                                    if (idx >= 0) {
                                      newItems[idx] = { ...newItems[idx], enabled: e.target.checked };
                                    } else {
                                      newItems.push({ grade_item_id: item.id, sonisweb_column: '', enabled: e.target.checked });
                                    }
                                    handleSaveConfig(course.id, { grade_items: newItems });
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">No grade items found for this course</p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {courses.length === 0 && (
          <div className="text-center py-12 text-gray-400">No courses found</div>
        )}
      </div>
    </div>
  );
}
