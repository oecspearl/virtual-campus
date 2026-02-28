"use client";

import { Suspense } from "react";
import QuizBuilder from "@/app/components/QuizBuilder";

function QuizBuilderWithSuspense() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg text-gray-600">Loading quiz builder...</div></div>}>
      <QuizBuilder />
    </Suspense>
  );
}

export default function Page() {
  return <QuizBuilderWithSuspense />;
}
