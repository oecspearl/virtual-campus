import Gradebook from "@/app/components/Gradebook";

export default async function GradebookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="max-w-[1000px] mx-auto px-4 py-8">
      <h1 className="text-2xl font-medium text-gray-900 mb-4">Gradebook</h1>
      <Gradebook classId={id} />
    </div>
  );
}
