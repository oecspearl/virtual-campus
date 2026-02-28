import ClassCard, { ClassInfo } from "@/app/components/ClassCard";
import Link from "next/link";

async function getClasses(term?: string) {
  const url = term ? `/api/classes?term=${encodeURIComponent(term)}` : "/api/classes";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [] as ClassInfo[];
  const data = (await res.json()) as { classes?: ClassInfo[] };
  return data.classes || [];
}

export default async function ClassesPage({ searchParams }: { searchParams: Promise<{ term?: string }> }) {
  const { term } = await searchParams;
  const classes = await getClasses(term);
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium text-gray-900">Classes</h1>
        <Link href="/classes/create" className="text-sm text-white bg-blue-500 hover:bg-blue-600 px-3 py-1.5 rounded-md">Create Class</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((c) => (
          <ClassCard key={c.id} cls={c} />
        ))}
      </div>
    </div>
  );
}
