export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-500">Overview of your outreach and pipeline.</p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Contacts", value: "0" },
          { label: "In Outreach", value: "0" },
          { label: "In Pipeline", value: "0" },
          { label: "Closed Won", value: "0" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-zinc-500">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold text-zinc-900">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
