export default function ContactDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Contact</h1>
      <p className="mt-1 text-sm text-zinc-500">ID: {params.id}</p>
    </div>
  );
}
