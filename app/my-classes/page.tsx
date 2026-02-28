import ClassCard from "@/app/components/ClassCard";

async function getMyClasses() {
  const res = await fetch("/api/my-classes", { cache: "no-store" });
  if (!res.ok) return [] as Array<Record<string, unknown>>;
  const d = await res.json();
  return (d.classes || []) as Array<Record<string, unknown>>;
}

export default async function MyClassesPage() {
  const classes = await getMyClasses();
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium text-gray-900">My Classes</h1>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((c) => (
          <ClassCard key={String(c.id)} cls={{
            id: String(c.id),
            name: String(c.name || "Class"),
            term: String(c.term || ""),
            section: String(c.section || ""),
            schedule: c.schedule as { days?: string[]; start_time?: string; end_time?: string; room?: string },
          }} />
        ))}
      </div>
    </div>
  );
}
