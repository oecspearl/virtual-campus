"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { SurveyBuilder } from "@/app/components/surveys";

export default function CreateSurveyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <SurveyBuilder
        mode="create"
        onSave={() => {
          router.push('/surveys');
        }}
      />
    </div>
  );
}
