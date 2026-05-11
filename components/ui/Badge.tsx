import { cn } from "@/lib/utils";

interface BadgeProps {
  label: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function Badge({ label, className, style }: BadgeProps) {
  return (
    <span
      style={style}
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        className
      )}
    >
      {label}
    </span>
  );
}
