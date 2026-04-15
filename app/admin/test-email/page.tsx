"use client";

import { useState } from "react";
import Button from "@/app/components/ui/Button";

export default function TestEmailPage() {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("Test Email from OECS Virtual Campus");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string; suggestion?: string } | null>(null);

  async function sendTestEmail() {
    if (!email || !email.includes("@")) {
      setResult({ success: false, error: "Please enter a valid email address" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject: subject,
          message: message || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResult({
          success: true,
          message: `Email sent successfully! Message ID: ${data.messageId || "N/A"}`,
        });
        // Clear form on success
        setEmail("");
        setSubject("Test Email from OECS Virtual Campus");
        setMessage("");
      } else {
        setResult({
          success: false,
          error: data.error || data.message || data.details || "Failed to send email",
          suggestion: data.suggestion,
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || "Network error. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Test Email Notification</h1>

        {result && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              result.success
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {result.success ? (
              <div>
                <p className="font-semibold">✅ Success!</p>
                <p className="mt-1">{result.message}</p>
              </div>
            ) : (
              <div>
                <p className="font-semibold">❌ Error</p>
                <p className="mt-1">{result.error}</p>
                {result.error && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                    <p className="font-semibold">Setup Required:</p>
                    {result.error.includes("domain is not verified") ? (
                      <div className="space-y-2">
                        <p className="font-semibold text-red-700">Domain Verification Error</p>
                        <p>Your domain <code className="bg-gray-200 px-1 rounded">oecslearning.org</code> is not verified in Resend.</p>
                        <div className="mt-3 space-y-2">
                          <p className="font-semibold">Quick Fix (Testing):</p>
                          <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>Update your <code className="bg-gray-200 px-1 rounded">.env</code> file:</li>
                            <li className="ml-4">
                              <code className="bg-gray-800 text-green-400 px-2 py-1 rounded text-xs block mt-1">
                                RESEND_FROM_EMAIL=onboarding@resend.dev
                              </code>
                            </li>
                            <li>Restart your server and try again</li>
                          </ol>
                          <p className="font-semibold mt-3">Production Fix:</p>
                          <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>Go to <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://resend.com/domains</a></li>
                            <li>Add and verify your domain <code className="bg-gray-200 px-1 rounded">oecslearning.org</code></li>
                            <li>Add DNS records (SPF, DKIM) to your DNS provider</li>
                            <li>Wait for verification (15-60 minutes)</li>
                          </ol>
                        </div>
                      </div>
                    ) : result.error.includes("RESEND_API_KEY") ? (
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Make sure RESEND_API_KEY is set in environment variables</li>
                        <li>Check RESEND_FROM_EMAIL is configured (or uses default)</li>
                        <li>Verify Resend API key is valid</li>
                      </ul>
                    ) : (
                      <p>See error message above for details.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              To Email Address *
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter the email address where you want to receive the test email
            </p>
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Test Email Subject"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Custom Message (Optional)
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Leave empty to use default test message"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">HTML is supported</p>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              onClick={sendTestEmail}
              disabled={loading || !email}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Sending..." : "Send Test Email"}
            </Button>
            {loading && (
              <div className="flex items-center text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-sm">Sending email...</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">How to Test via API</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">You can also test via API:</p>
            <pre className="text-xs bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
{`curl -X POST http://localhost:3000/api/notifications/test \\
  -H "Content-Type: application/json" \\
  -H "Cookie: your-auth-cookie" \\
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "message": "Custom message here"
  }'`}
            </pre>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Configuration Check</h2>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">
              Make sure these are set in your environment:
            </p>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li><code className="bg-gray-200 px-1 rounded">RESEND_API_KEY</code> - Required</li>
              <li><code className="bg-gray-200 px-1 rounded">RESEND_FROM_EMAIL</code> - Optional (defaults to onboarding@resend.dev)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

