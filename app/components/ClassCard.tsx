"use client";
import { motion } from "framer-motion";
import Link from "next/link";

export type ClassInfo = {
  id: string;
  name: string;
  term: string;
  section?: string;
  schedule?: { days?: string[]; start_time?: string; end_time?: string; room?: string };
  instructor_ids?: string[];
};

export default function ClassCard({ cls }: { cls: ClassInfo }) {
  const scheduleText = [
    (cls.schedule?.days || []).join("/"),
    cls.schedule?.start_time && cls.schedule?.end_time ? `${cls.schedule.start_time} - ${cls.schedule.end_time}` : "",
    cls.schedule?.room ? `Room ${cls.schedule.room}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-gray-200/60 bg-white/70 backdrop-blur p-4 shadow-sm hover:shadow-md transition">
      <Link href={`/class/${cls.id}`} className="block">
        <h3 className="text-base font-medium text-gray-900 mb-1">{cls.name}</h3>
        <p className="text-xs text-gray-500">{cls.term}{cls.section ? ` • ${cls.section}` : ""}</p>
        {scheduleText ? <p className="text-xs text-gray-600 mt-2">{scheduleText}</p> : null}
      </Link>
    </motion.div>
  );
}
