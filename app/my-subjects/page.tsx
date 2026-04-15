'use client';

import React from 'react';
import SubjectSelector from '@/app/components/SubjectSelector';
import Link from 'next/link';

export default function MySubjectsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = React.useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [courses, setCourses] = React.useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [subjects, setSubjects] = React.useState<any[]>([]);
  const [courseFilter, setCourseFilter] = React.useState<string>('');

  React.useEffect(()=>{ (async ()=>{
    const res = await fetch('/api/auth/profile', { cache: 'no-store' });
    if (res.ok) setProfile(await res.json());
  })(); }, []);

  React.useEffect(()=>{ (async ()=>{
    if (!profile?.id) return;
    const eRes = await fetch('/api/enrollments?me=1', { cache: 'no-store' });
    const eData = await eRes.json();
    const enrollments = Array.isArray(eData.enrollments)? eData.enrollments: [];
    const courseRows: any[] = [];
    const subjectsAll: any[] = [];
    for (const e of enrollments) {
      const cRes = await fetch(`/api/courses/${e.course_id}`, { cache: 'no-store' });
      const course = await cRes.json();
      courseRows.push(course);
      const sRes = await fetch(`/api/courses/${e.course_id}/subjects`, { cache: 'no-store' });
      const sData = await sRes.json();
      subjectsAll.push(...(sData.subjects||[]));
    }
    setCourses(courseRows);
    setSubjects(subjectsAll);
  })(); }, [profile]);

  const options = courses.map((c)=> ({ id: c.id, title: c.title }));
  const filtered = courseFilter ? subjects.filter((s)=> s.course_id === courseFilter) : subjects;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium text-gray-900"><span>My Subjects</span></h1>
        <div className="w-64">
          <SubjectSelector subjects={options} value={courseFilter} onChange={setCourseFilter} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtered.map((s:any)=> (
          <div key={s.id} className="rounded-lg border bg-white p-4">
            <h3 className="text-sm text-gray-900">{s.title}</h3>
            <p className="mt-1 text-xs text-gray-600">{s.description}</p>
            <Link href={`/course/${s.course_id}`} className="mt-2 inline-block text-xs text-[#3B82F6] underline"><span>View Course</span></Link>
          </div>
        ))}
      </div>
    </div>
  );
}
