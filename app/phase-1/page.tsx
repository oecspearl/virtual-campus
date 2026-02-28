export default function Page() {
  return (
    <main className="min-h-screen px-6 md:px-10 py-12 max-w-5xl mx-auto">
      <section className="space-y-6">
        <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-neutral-900">Phase 1 Preview: Foundation & Authentication</h1>
        <p className="text-sm text-neutral-600">Use the links below to explore the Phase 1 deliverables: authentication, RBAC, admin/user management, and the core public pages.</p>
        <div className="flex gap-3 text-sm">
          <a href="/" className="text-[#3B82F6] underline">Home</a>
          <span className="text-neutral-400">/</span>
          <a href="/phase-2" className="text-[#3B82F6] underline">Go to Phase 2 Preview</a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href="/" className="rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 transition">
            <h2 className="text-base font-medium text-neutral-900">Landing</h2>
            <p className="text-xs text-neutral-600">Overview hero, features, CTAs</p>
          </a>
          <a href="/about" className="rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 transition">
            <h2 className="text-base font-medium text-neutral-900">About</h2>
            <p className="text-xs text-neutral-600">Mission, team, contact</p>
          </a>
          <a href="/dashboard" className="rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 transition">
            <h2 className="text-base font-medium text-neutral-900">Dashboard</h2>
            <p className="text-xs text-neutral-600">Role-aware widgets (auth required)</p>
          </a>
          <a href="/admin/users" className="rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 transition">
            <h2 className="text-base font-medium text-neutral-900">Admin • Users</h2>
            <p className="text-xs text-neutral-600">Search, filter, create/edit, CSV import (admin only)</p>
          </a>
        </div>
        <div className="pt-4">
          <p className="text-xs text-neutral-500">Tip: If you are not signed in, protected pages will redirect you to the sign-in flow.</p>
        </div>
      </section>
    </main>
  );
}
