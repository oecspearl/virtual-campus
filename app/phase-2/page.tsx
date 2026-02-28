export default function Page() {
  return (
    <main className="min-h-screen px-6 md:px-10 py-12 max-w-5xl mx-auto">
      <section className="space-y-6">
        <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-neutral-900">Phase 2 Preview: Core LMS • Content Management</h1>
        <p className="text-sm text-neutral-600">Explore courses, subjects, lessons, editors, viewer, uploads, and student pages. All routes are wired to Cosmic Auth, Database, and Files.</p>
        <div className="flex gap-3 text-sm">
          <a href="/" className="text-[#3B82F6] underline">Home</a>
          <span className="text-neutral-400">/</span>
          <a href="/phase-1" className="text-[#3B82F6] underline">Go to Phase 1 Preview</a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href="/courses" className="rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 transition">
            <h2 className="text-base font-medium text-neutral-900">Courses</h2>
            <p className="text-xs text-neutral-600">Browse/search courses • Create (instructor/admin)</p>
          </a>
          <a href="/manage-lessons" className="rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 transition">
            <h2 className="text-base font-medium text-neutral-900">Manage Lessons</h2>
            <p className="text-xs text-neutral-600">Sort, reorder (drag), quick actions, import/export</p>
          </a>
          <a href="/my-courses" className="rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 transition">
            <h2 className="text-base font-medium text-neutral-900">My Courses</h2>
            <p className="text-xs text-neutral-600">Enrolled courses with progress</p>
          </a>
          <a href="/my-subjects" className="rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 transition">
            <h2 className="text-base font-medium text-neutral-900">My Subjects</h2>
            <p className="text-xs text-neutral-600">Subjects across enrollments • Filter by course</p>
          </a>
        </div>
        <div className="pt-4 space-y-2">
          <p className="text-xs text-neutral-500">Course Detail: open any course from /courses to view syllabus, subjects, lessons, enroll, and progress.</p>
          <p className="text-xs text-neutral-500">Lesson Viewer: navigate via a course page to /course/[id]/lesson/[lessonId].</p>
          <p className="text-xs text-neutral-500">Lesson Editor: use quick actions in Manage Lessons or /lessons/[id]/edit for rich content editing.</p>
        </div>
      </section>
    </main>
  );
}
