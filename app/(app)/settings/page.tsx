export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
      <p className="mt-1 text-sm text-zinc-500">Manage pipeline stages, tiers, tags, and custom fields.</p>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[
          { title: "Pipeline Stages", desc: "Add, rename, or reorder your pipeline columns." },
          { title: "Tiers", desc: "Rename T1, T2, T3 to match your workflow." },
          { title: "Company Tags", desc: "Define company type tags for segmenting contacts." },
          { title: "Custom Fields", desc: "Add custom fields to contacts and deals." },
        ].map((section) => (
          <div key={section.title} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="font-medium text-zinc-900">{section.title}</h2>
            <p className="mt-1 text-sm text-zinc-500">{section.desc}</p>
            <button className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Manage →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
