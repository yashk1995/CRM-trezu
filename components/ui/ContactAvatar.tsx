import { cn } from "@/lib/utils";

// Square avatar with rounded corners — matches design system
const SIZES = {
  xs: "w-5 h-5 rounded-[5px] text-[9px]",
  sm: "w-6 h-6 rounded-[6px] text-[10px]",
  md: "w-8 h-8 rounded-[8px] text-xs",
  lg: "w-14 h-14 rounded-[12px] text-lg",
};

const COLORS = [
  "bg-[#DCE6FF] text-[#003DCA]",  // b1 – brand wash
  "bg-[#FFE7C7] text-[#8A5300]",  // b2 – amber
  "bg-[#D6F4E4] text-[#006A47]",  // b3 – emerald
  "bg-[#F4D9F0] text-[#7E2476]",  // b4 – pink
  "bg-[#E6E1FB] text-[#3D2DB0]",  // b5 – violet
  "bg-[#D9EFFB] text-[#14638E]",  // b6 – sky
  "bg-[#FFDCE0] text-[#962633]",  // b7 – rose
  "bg-[#2A2D36] text-white",       // b8 – ink
];

function colorClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

interface Props {
  logoUrl?: string | null;
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}

export default function ContactAvatar({ logoUrl, name, size = "md", className }: Props) {
  const initial = (name ?? "?").charAt(0).toUpperCase();
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={cn("shrink-0 object-cover", SIZES[size], className)}
      />
    );
  }
  return (
    <div className={cn(
      "flex shrink-0 items-center justify-center font-semibold",
      SIZES[size],
      colorClass(name),
      className,
    )}>
      {initial}
    </div>
  );
}
