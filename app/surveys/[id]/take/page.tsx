"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { SurveyPlayer } from "@/app/components/surveys";

export default function TakeSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Survey Player */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <SurveyPlayer
            surveyId={surveyId}
            onComplete={() => {
              // Stay on page to show thank you message
            }}
            onClose={() => {
              // Go back to previous page or home
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push('/');
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
