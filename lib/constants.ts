export const OUTREACH_STATUSES = ["not_contacted", "dm_sent", "rejected"] as const;

export const STATUS_LABELS: Record<string, string> = {
  not_contacted: "Not Contacted",
  dm_sent: "DM Sent",
  rejected: "Rejected",
  in_pipeline: "In Pipeline",
};

export const STATUS_COLORS: Record<string, string> = {
  not_contacted: "bg-zinc-100 text-zinc-600",
  dm_sent: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-600",
  in_pipeline: "bg-indigo-100 text-indigo-700",
};

export function isOutreachStatus(status: string) {
  return (OUTREACH_STATUSES as readonly string[]).includes(status);
}
