import RosterTable from "@/app/components/RosterTable";

export default async function RosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-medium text-gray-900 mb-4">Roster</h1>
      <RosterTable classId={id} />
    </div>
  );
}
