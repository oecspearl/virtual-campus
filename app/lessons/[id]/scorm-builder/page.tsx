'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import RoleGuard from '@/app/components/RoleGuard';
import SCORMBuilder from '@/app/components/scorm/SCORMBuilder';
import LoadingIndicator from '@/app/components/ui/LoadingIndicator';
import type { SCORMBuilderData } from '@/lib/scorm/types';

export default function SCORMBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [lessonTitle, setLessonTitle] = React.useState('');
  const [courseId, setCourseId] = React.useState<string | undefined>();
  const [existingData, setExistingData] = React.useState<SCORMBuilderData | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        // Load lesson info
        const res = await fetch(`/api/lessons/${id}`, { cache: 'no-store' });
        if (res.ok) {
          const lesson = await res.json();
          setLessonTitle(lesson.title || '');
          setCourseId(lesson.course_id || undefined);

          // If lesson already has a SCORM package, try to load builder source data
          if (lesson.content_type === 'scorm') {
            const scormRes = await fetch(`/api/scorm/package/${id}`, { cache: 'no-store' });
            if (scormRes.ok) {
              const scormData = await scormRes.json();
              const pkg = scormData.scormPackage;
              if (pkg?.package_url) {
                // Try to load the builder-source.json alongside the package
                const folder = pkg.package_url.split('/').slice(0, 2).join('/');
                const sourceRes = await fetch(`/api/scorm/serve/${folder}/builder-source.json`);
                if (sourceRes.ok) {
                  const sourceData = await sourceRes.json();
                  setExistingData(sourceData);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error loading lesson:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingIndicator />
      </div>
    );
  }

  return (
    <RoleGuard roles={['instructor', 'curriculum_designer', 'admin', 'super_admin', 'tenant_admin']}>
      <div className="min-h-screen bg-gray-50">
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/lessons/${id}/edit`)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <Icon icon="material-symbols:arrow-back" className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">SCORM Builder</h1>
                <p className="text-xs text-gray-500">
                  {lessonTitle ? `Lesson: ${lessonTitle}` : 'Create interactive SCORM content'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Icon icon="material-symbols:package-2" className="w-4 h-4" />
              SCORM 2004
            </div>
          </div>
        </div>

        {/* ─── Builder ────────────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-6 py-6">
          <SCORMBuilder
            lessonId={id}
            courseId={courseId}
            initialData={existingData}
            onGenerated={(result) => {
              // After successful generation, navigate back to lesson edit
              setTimeout(() => {
                router.push(`/lessons/${id}/edit`);
              }, 1500);
            }}
          />
        </div>
      </div>
    </RoleGuard>
  );
}
