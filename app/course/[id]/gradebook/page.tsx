'use client';

import { useParams, redirect } from 'next/navigation';

export default function CourseGradebookRedirect() {
  const { id } = useParams<{ id: string }>();
  redirect(`/course/${id}/grades`);
}
