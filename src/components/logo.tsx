import Link from "next/link";
import { cn } from "@/lib/utils";

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn("size-10", className)}>
      <defs>
        <linearGradient id="sistema-fitness-mark" x1="8" y1="40" x2="40" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0f8f6a" />
          <stop offset="0.55" stopColor="#42d49b" />
          <stop offset="1" stopColor="#f0c257" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="38" height="38" rx="13" fill="url(#sistema-fitness-mark)" />
      <path
        d="M15 31.5V15h18.5M15 23.2h14.2M22.5 31.5V23.2"
        fill="none"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M28.5 31.5h4.8l3.1-6.7" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ href = "/", compact = false, className }: { href?: string; compact?: boolean; className?: string }) {
  const content = (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <LogoMark />
      {!compact ? (
        <span className="grid leading-none">
          <span className="text-xl font-black tracking-normal">Sistema Fitness</span>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">Performance</span>
        </span>
      ) : null}
    </span>
  );

  return href ? (
    <Link href={href} aria-label="Sistema Fitness">
      {content}
    </Link>
  ) : (
    content
  );
}
