import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export default async function ClassDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    const supabase = await createServerSupabaseClient();
    const { data: cls, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !cls) {
      return <div className="max-w-5xl mx-auto px-4 py-10"><p className="text-sm text-red-600">Class not found.</p></div>;
    }
    
    const schedule = cls.schedule as { days?: string[]; start_time?: string; end_time?: string; room?: string } | undefined;
    const scheduleText = [
      (schedule?.days || []).join("/"),
      schedule?.start_time && schedule?.end_time ? `${schedule.start_time} - ${schedule.end_time}` : "",
      schedule?.room ? `Room ${schedule.room}` : "",
    ].filter(Boolean).join(" · ");

    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-medium text-gray-900">{String(cls.name || "Class")}</h1>
          <p className="text-xs text-gray-500">{String(cls.term || "")} {String(cls.section || "")} {scheduleText ? `• ${scheduleText}` : ""}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8 text-sm">
          <div className="rounded-lg border p-4 bg-white/70"> <p className="text-gray-500">Enrollment</p><p className="text-lg">—</p></div>
          <div className="rounded-lg border p-4 bg-white/70"> <p className="text-gray-500">Average Grade</p><p className="text-lg">—</p></div>
          <div className="rounded-lg border p-4 bg-white/70"> <p className="text-gray-500">Attendance Rate</p><p className="text-lg">—</p></div>
          <div className="rounded-lg border p-4 bg-white/70"> <p className="text-gray-500">Upcoming</p><p className="text-lg">—</p></div>
        </div>

        <div className="flex gap-2 text-sm mb-6">
          <Link href={`/class/${id}/roster`} className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50">Roster</Link>
          <Link href={`/class/${id}/gradebook`} className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50">Gradebook</Link>
          <Link href={`/class/${id}/gradebook/setup`} className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50">Grade Setup</Link>
          <Link href={`/class/${id}/attendance`} className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50">Attendance</Link>
          <Link href={`/class/${id}/grades`} className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50">My Grades</Link>
        </div>

        <div className="rounded-lg border bg-white/70 p-4">
          <p className="text-sm text-gray-700">Use the tabs above to manage your class.</p>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching class:", error);
    return <div className="max-w-5xl mx-auto px-4 py-10"><p className="text-sm text-red-600">Error loading class. Please try again later.</p></div>;
  }
}
