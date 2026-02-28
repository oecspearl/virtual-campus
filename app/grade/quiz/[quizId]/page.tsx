"use client";

import React from "react";
import { useParams } from "next/navigation";

export default function Page() {
  const params = useParams<{ quizId: string }>();
  const quizId = params.quizId;
  const [quiz, setQuiz] = React.useState<any | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [attempts, setAttempts] = React.useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any

  React.useEffect(() => {
    let active = true;
    (async () => {
      const q = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}`).then((r) => r.json());
      const a = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/attempts?studentId=*`).then((r) => r.json());
      if (!active) return;
      setQuiz(q);
      setAttempts(a.attempts ?? []);
    })();
    return () => { active = false; };
  }, [quizId]);

  const total = attempts.length;
  const avg = total ? Math.round((attempts.reduce((s, a) => s + Number(a.percentage ?? 0), 0) / total)) : 0;
  const correctPct = avg;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-medium text-gray-900">Quiz Grading</h1>
      <div className="rounded-md border p-3 sm:p-4 text-sm text-gray-700">
        <div className="mb-2"><span className="font-medium">Quiz:</span> {quiz?.title}</div>
        <div className="mb-2"><span className="font-medium">Attempts:</span> {total}</div>
        <div><span className="font-medium">Average score:</span> {avg}%</div>
      </div>

      <div className="overflow-x-auto rounded-md border -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="w-full text-left text-sm min-w-[600px]">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold">Student</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold">Status</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold">Score</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold">Time</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-800 font-medium">
                    <div>{a.student?.name || "Unknown"}</div>
                    {a.student?.email && <div className="text-xs text-gray-500 font-normal">{a.student.email}</div>}
                  </td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-600">{a.status}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-600">{a.percentage ?? "—"}%</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-600">{a.time_taken ? `${Math.floor(a.time_taken/60)}m ${a.time_taken%60}s` : "—"}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3">
                    <a 
                      href={`/quiz/${quizId}/attempt/${a.id}/results`} 
                      className="text-blue-600 hover:text-blue-800 underline min-h-[44px] min-w-[44px] inline-flex items-center"
                    >
                      Review
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
