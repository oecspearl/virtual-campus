import { createServiceSupabaseClient } from "@/lib/supabase-server";
import QuizList from "@/app/components/quiz/QuizList";
import Breadcrumb from "@/app/components/ui/Breadcrumb";

// Disable caching for this page to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page() {
  try {
    // Use service client to bypass RLS and prevent recursion errors
    const supabase = createServiceSupabaseClient();
    
    // Fetch quizzes - ensure we're not getting any that don't exist
    // Note: Since we're using hard delete (not soft delete), deleted quizzes won't exist in the database
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('id, title, published')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) {
      console.error('[Quizzes Page] Error fetching quizzes:', error);
      throw error;
    }
    
    // Double-check: filter out any quizzes that might have been deleted
    // This is a safety measure in case of race conditions
    const validQuizzes = (quizzes || []).filter(quiz => quiz && quiz.id);
    
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Quizzes' },
            ]}
            className="mb-6"
          />
          <QuizList initialQuizzes={validQuizzes} />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="mx-auto max-w-sm text-center">
          <div className="bg-white rounded-lg border border-gray-200/80 p-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-base font-medium text-slate-900 mb-1">Error Loading Quizzes</h2>
            <p className="text-sm text-slate-500 mb-5">Please try again later.</p>
            <a
              href="/quizzes"
              className="inline-flex items-center px-3 py-1.5 text-xs border border-gray-200 text-slate-600 hover:bg-gray-50 rounded-md transition-colors"
            >
              Try Again
            </a>
          </div>
        </div>
      </div>
    );
  }
}
