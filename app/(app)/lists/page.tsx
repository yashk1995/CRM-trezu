"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { List } from "lucide-react";

export default function ListsPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    // Try to redirect to the first list
    fetch("/api/lists")
      .then((r) => r.json())
      .then((lists) => {
        if (lists && lists.length > 0) {
          router.replace(`/lists/${lists[0].id}`);
        }
      });
  }, [router]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) {
      const list = await res.json();
      router.push(`/lists/${list.id}`);
    }
    setCreating(false);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <List size={48} className="text-zinc-300" />
      <h2 className="text-xl font-semibold text-zinc-700">No lists yet</h2>
      <p className="text-sm text-zinc-400">Create your first list to organize contacts.</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="List name…"
          className="rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={handleCreate}
          disabled={creating || !name.trim()}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Create list
        </button>
      </div>
    </div>
  );
}
