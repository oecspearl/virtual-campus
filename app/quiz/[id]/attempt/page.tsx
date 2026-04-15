"use client";

import { useParams } from "next/navigation";
import QuizPlayer from "@/app/components/quiz/QuizPlayer";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <QuizPlayer quizId={params.id} />;
}
