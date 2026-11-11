// apps/admin/components/ui/Avatar.tsx — a person's initials in a circle.

interface AvatarProps {
  name?: string;
  size?: number;
  /** Gold fill, for use on the navy sidebar. */
  onDark?: boolean;
}

export function initialsOf(name?: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ name, size = 36, onDark = false }: AvatarProps) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size < 40 ? 12 : 14 }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-navy ${
        onDark ? "bg-gold" : "bg-[#E7EAF1]"
      }`}
    >
      {initialsOf(name)}
    </span>
  );
}
