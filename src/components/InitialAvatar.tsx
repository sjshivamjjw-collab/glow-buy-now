import React from "react";
import { cn } from "@/lib/utils";

interface InitialAvatarProps {
  name?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  size?: number; // px
  className?: string;
  alt?: string;
}

// Muted, dark-theme-friendly palette
const COLORS = [
  "#475569", // slate
  "#4f46e5", // indigo
  "#059669", // emerald
  "#d97706", // amber
  "#dc2626", // rose/red
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#db2777", // pink
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function getInitial(name?: string | null, username?: string | null): string {
  const n = (name || "").trim();
  if (n) return n.charAt(0).toUpperCase();
  const u = (username || "").trim().replace(/^@/, "");
  if (u) return u.charAt(0).toUpperCase();
  return "?";
}

const InitialAvatar: React.FC<InitialAvatarProps> = ({
  name,
  username,
  avatarUrl,
  size = 40,
  className,
  alt,
}) => {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={alt ?? name ?? username ?? ""}
        style={{ width: size, height: size }}
        className={cn("rounded-full object-cover shrink-0", className)}
        loading="lazy"
      />
    );
  }

  const initial = getInitial(name, username);
  const key = (username || name || "?").toLowerCase();
  const bg = COLORS[hashString(key) % COLORS.length];

  return (
    <div
      style={{ width: size, height: size, backgroundColor: bg, fontSize: Math.max(10, Math.round(size * 0.45)) }}
      className={cn(
        "rounded-full shrink-0 flex items-center justify-center font-bold text-white select-none",
        className,
      )}
      aria-label={alt ?? name ?? username ?? "avatar"}
    >
      {initial}
    </div>
  );
};

export default InitialAvatar;
