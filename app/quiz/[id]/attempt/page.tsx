"use client";

import { useParams } from "next/navigation";
import QuizPlayer from "@/app/components/QuizPlayer";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <QuizPlayer quizId={params.id} />;
}
