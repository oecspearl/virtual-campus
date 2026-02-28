import { createServiceSupabaseClient } from "@/lib/supabase-server";
import QuizList from "@/app/components/QuizList";
import Breadcrumb from "@/app/components/Breadcrumb";

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8 py-6">
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="mx-auto max-w-md text-center">
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Quizzes</h2>
            <p className="text-gray-600 mb-6">We encountered an issue while loading the quizzes. Please try again later.</p>
            <a
              href="/quizzes"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </a>
          </div>
        </div>
      </div>
    );
  }
}
