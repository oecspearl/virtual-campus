"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { SurveyBuilder } from "@/app/components/surveys";

export default function EditSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  const [survey, setSurvey] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [accessChecked, setAccessChecked] = React.useState(false);

  React.useEffect(() => {
    loadUserProfile();
  }, []);

  React.useEffect(() => {
    if (accessChecked) {
      loadSurvey();
    }
  }, [surveyId, accessChecked]);

  async function loadUserProfile() {
    try {
      const response = await fetch('/api/auth/profile');
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role);
        setUserId(data.id);
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
    } finally {
      setAccessChecked(true);
    }
  }

  async function loadSurvey() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/surveys/${surveyId}`);
      if (!response.ok) {
        throw new Error('Survey not found');
      }
      const data = await response.json();

      // Check if user has permission to edit
      const canManage = userRole && ['instructor', 'curriculum_designer', 'admin', 'super_admin'].includes(userRole);
      const isCreator = userId && data.creator_id === userId;

      if (!canManage && !isCreator) {
        // Redirect students to the survey page
        router.replace(`/surveys/${surveyId}`);
        return;
      }

      setSurvey(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load survey');
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

  if (error || !survey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50/50">
        <Icon icon="material-symbols:error" className="w-16 h-16 text-red-400 mb-4" />
        <p className="text-gray-600">{error || 'Survey not found'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <SurveyBuilder
        surveyId={surveyId}
        initialData={survey}
        mode="edit"
        onSave={() => {
          router.push(`/surveys/${surveyId}`);
        }}
      />
    </div>
  );
}
