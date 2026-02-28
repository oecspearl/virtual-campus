import AttendanceGrid from "@/app/components/AttendanceGrid";

export default async function AttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-medium text-gray-900 mb-4">Attendance</h1>
      <AttendanceGrid classId={id} />
    </div>
  );
}
