import Link from "next/link";
import { getCurrentUser } from "@/lib/database-helpers";
import Breadcrumb from "@/app/components/ui/Breadcrumb";
import StudentDashboard from "./_components/StudentDashboard";
import InstructorDashboard from "./_components/InstructorDashboard";
import AdminDashboard from "./_components/AdminDashboard";
import DesignerDashboard from "./_components/DesignerDashboard";
import ParentDashboard from "./_components/ParentDashboard";

async function getUserRoleAndName() {
  try {
    const user = await getCurrentUser();
    if (!user) return { role: null as string | null, name: "" };
    return { role: user.role || null, name: user.name || "" };
  } catch (err) {
    console.error('Dashboard: Failed to get user:', err);
    return { role: null as string | null, name: "" };
  }
}

export default async function DashboardPage() {
  const { role, name } = await getUserRoleAndName();

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Dashboard' },
          ]}
          className="mb-6"
        />

        {role === 'student' && <StudentDashboard name={name} />}
        {role === 'instructor' && <InstructorDashboard name={name} />}
        {(role === 'admin' || role === 'super_admin' || role === 'tenant_admin') && (
          <AdminDashboard name={name} role={role!} />
        )}
        {role === 'curriculum_designer' && <DesignerDashboard name={name} />}
        {role === 'parent' && <ParentDashboard name={name} />}

        {!role && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center bg-white rounded-lg border border-gray-200/80 p-10 max-w-sm">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">Authentication Required</h3>
              <p className="text-sm text-slate-500 mb-6">Please sign in to access your dashboard.</p>
              <Link
                href="/auth/signin"
                className="inline-flex items-center px-5 py-2 border border-slate-700 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
