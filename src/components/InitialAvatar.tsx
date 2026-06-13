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

// Single standard color for all initial avatars — keeps the UI consistent.
const BG_COLOR = "#2a2a2a";
const TEXT_COLOR = "#fafafa";

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

  return (
    <div
      style={{ width: size, height: size, backgroundColor: BG_COLOR, color: TEXT_COLOR, fontSize: Math.max(10, Math.round(size * 0.45)) }}
      className={cn(
        "rounded-full shrink-0 flex items-center justify-center font-bold select-none",
        className,
      )}
      aria-label={alt ?? name ?? username ?? "avatar"}
    >
      {initial}
    </div>
  );
};

export default InitialAvatar;
