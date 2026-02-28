import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/database-helpers";

export default async function Page() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return (
        <div className="mx-auto max-w-4xl p-4">
          <h1 className="text-xl font-medium text-gray-900">My Submissions</h1>
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-600">Please sign in to view your submissions.</p>
          </div>
        </div>
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: submissions, error } = await supabase
      .from('assignment_submissions')
      .select('id, assignment_id, status, grade, submitted_at')
      .eq('student_id', user.id)
      .limit(100);
    
    if (error) throw error;
    
    return (
      <div className="mx-auto max-w-4xl p-4">
        <h1 className="text-xl font-medium text-gray-900">My Submissions</h1>
        <div className="mt-4 overflow-hidden rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600"><tr><th className="px-3 py-2">Assignment</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Submitted</th><th className="px-3 py-2">Grade</th></tr></thead>
            <tbody>
              {(submissions || []).map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-3 py-2 text-gray-800"><Link href={`/assignment/${s.assignment_id}`} className="text-[#3B82F6] underline"><span>{s.assignment_id}</span></Link></td>
                  <td className="px-3 py-2 text-gray-600">{s.status}</td>
                  <td className="px-3 py-2 text-gray-600">{s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "—"}</td>
                  <td className="px-3 py-2 text-gray-600">{s.grade ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return (
      <div className="mx-auto max-w-4xl p-4">
        <h1 className="text-xl font-medium text-gray-900">My Submissions</h1>
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">Error loading submissions. Please try again later.</p>
        </div>
      </div>
    );
  }
}
