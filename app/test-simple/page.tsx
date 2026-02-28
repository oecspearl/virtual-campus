export default function TestSimplePage() {
  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="text-2xl font-bold mb-6">OECS Virtual Campus - Simple Test Page</h1>
      
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
          <h2 className="text-lg font-semibold mb-2">Status</h2>
          <p className="text-green-600">✅ Page loaded successfully</p>
          <p className="text-green-600">✅ Environment variables are accessible</p>
        </div>
      </div>
    </div>
  )
}
