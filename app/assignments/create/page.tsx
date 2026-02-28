"use client";

import AssignmentBuilder from "@/app/components/AssignmentBuilder";
import RoleGuard from "@/app/components/RoleGuard";

export default function Page() {
  return (
    <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]} fallback={
      <div className="max-w-4xl mx-auto p-6 text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You do not have permission to create assignments. Only instructors and administrators can create assignments.</p>
      </div>
    }>
      <AssignmentBuilder />
    </RoleGuard>
  );
}
