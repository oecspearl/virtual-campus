"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { SurveyAnalyticsDashboard } from "@/app/components/surveys";

export default function SurveyResultsPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  const [loading, setLoading] = React.useState(true);
  const [hasAccess, setHasAccess] = React.useState(false);

  React.useEffect(() => {
    checkAccess();
  }, [surveyId]);

  async function checkAccess() {
    try {
      // Get user profile
      const profileResponse = await fetch('/api/auth/profile');
      if (!profileResponse.ok) {
        router.replace(`/surveys/${surveyId}`);
        return;
      }
      const profile = await profileResponse.json();

      // Get survey to check creator
      const surveyResponse = await fetch(`/api/surveys/${surveyId}`);
      if (!surveyResponse.ok) {
        router.replace(`/surveys/${surveyId}`);
        return;
      }
      const survey = await surveyResponse.json();

      // Check permissions
      const canManage = ['instructor', 'curriculum_designer', 'admin', 'super_admin'].includes(profile.role);
      const isCreator = profile.id === survey.creator_id;

      if (!canManage && !isCreator) {
        // Redirect students to the survey page
        router.replace(`/surveys/${surveyId}`);
        return;
      }

      setHasAccess(true);
    } catch (err) {
      console.error('Access check failed:', err);
      router.replace(`/surveys/${surveyId}`);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50/50">
        <Icon icon="material-symbols:progress-activity" className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back link */}
        <div className="mb-6">
          <Link href={`/surveys/${surveyId}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            <Icon icon="material-symbols:arrow-back" className="w-4 h-4" />
            Back to Survey Details
          </Link>
        </div>

        {/* Analytics Dashboard */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <SurveyAnalyticsDashboard surveyId={surveyId} />
        </div>
      </div>
    </div>
  );
}
