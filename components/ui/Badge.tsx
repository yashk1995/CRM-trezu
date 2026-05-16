import { cn } from "@/lib/utils";

interface BadgeProps {
  label: string;
  className?: string;
  style?: React.CSSProperties;
  dot?: boolean;
}

export default function Badge({ label, className, style, dot }: BadgeProps) {
  return (
    <span
      style={style}
      className={cn(
        "inline-flex items-center gap-1 rounded-[4px] px-[7px] text-[11px] font-semibold leading-5 tracking-[0.01em] border border-[var(--mist)] bg-[var(--cloud)] text-[var(--slate)] whitespace-nowrap",
        dot && "before:content-[''] before:inline-block before:w-1.5 before:h-1.5 before:rounded-full before:bg-current before:opacity-85",
        className
      )}
    >
      {label}
    </span>
  );
}
