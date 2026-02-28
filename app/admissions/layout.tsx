import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admissions — OECS Virtual Campus',
  description: 'Apply to programmes at OECS Virtual Campus',
};

export default function AdmissionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-oecs-navy-blue rounded-none flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-gray-900 tracking-tight">OECS Virtual Campus</span>
          <span className="text-xs text-gray-400 ml-1">Admissions</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-12">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} OECS Virtual Campus. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
