import { createServerSupabaseClient } from "@/lib/supabase-server";

export default async function TestSupabasePage() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Test basic connection
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('count')
      .limit(1);
    
    const { data: quizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select('count')
      .limit(1);

    return (
      <div className="mx-auto max-w-4xl p-4">
        <h1 className="text-2xl font-bold mb-6">OECS Virtual Campus - Supabase Connection Test</h1>
        
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Environment Variables</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">NEXT_PUBLIC_SUPABASE_URL:</span> 
                <span className={process.env.NEXT_PUBLIC_SUPABASE_URL ? "text-green-600 ml-2" : "text-red-600 ml-2"}>
                  {process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing"}
                </span>
              </div>
              <div>
                <span className="font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY:</span> 
                <span className={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "text-green-600 ml-2" : "text-red-600 ml-2"}>
                  {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing"}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Database Connection Tests</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Users table:</span> 
                <span className={usersError ? "text-red-600 ml-2" : "text-green-600 ml-2"}>
                  {usersError ? `❌ Error: ${usersError.message}` : "✅ Connected"}
                </span>
              </div>
              <div>
                <span className="font-medium">Courses table:</span> 
                <span className={coursesError ? "text-red-600 ml-2" : "text-green-600 ml-2"}>
                  {coursesError ? `❌ Error: ${coursesError.message}` : "✅ Connected"}
                </span>
              </div>
              <div>
                <span className="font-medium">Quizzes table:</span> 
                <span className={quizzesError ? "text-red-600 ml-2" : "text-green-600 ml-2"}>
                  {quizzesError ? `❌ Error: ${quizzesError.message}` : "✅ Connected"}
                </span>
              </div>
            </div>
          </div>

          {!process.env.NEXT_PUBLIC_SUPABASE_URL && (
            <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
              <h2 className="text-lg font-semibold text-red-800 mb-2">Setup Required</h2>
              <p className="text-red-700">
                Please create a <code className="bg-red-100 px-1 rounded">.env.local</code> file with your Supabase credentials.
                See <code className="bg-red-100 px-1 rounded">ENV_SETUP_INSTRUCTIONS.md</code> for details.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="mx-auto max-w-4xl p-4">
        <h1 className="text-2xl font-bold mb-6 text-red-600">Supabase Connection Error</h1>
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <p className="text-red-700">
            <strong>Error:</strong> {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }
}
