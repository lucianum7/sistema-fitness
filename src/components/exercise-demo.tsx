import Image from "next/image";
import { cn } from "@/lib/utils";

export function ExerciseDemo({ kind, imageUrl, className }: { kind: string; imageUrl?: string | null; className?: string }) {
  if (imageUrl) {
    return (
      <figure className={cn("relative grid h-36 w-full place-items-center overflow-hidden rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)]", className)}>
        <Image
          src={imageUrl}
          alt={`Demonstração do exercício: ${kind}`}
          className="object-contain"
          fill
          sizes="(min-width: 768px) 220px, 100vw"
          unoptimized
        />
      </figure>
    );
  }

  return (
    <svg
      viewBox="0 0 220 160"
      role="img"
      aria-label={`Animação demonstrativa: ${kind}`}
      className={cn("h-36 w-full rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)]", className)}
    >
      <rect x="18" y="124" width="184" height="8" rx="4" fill="var(--line)" />
      <circle className="pulse-ring" cx="110" cy="38" r="14" fill="var(--primary)" />
      <path className="pulse-ring" d="M110 52 L96 86 L122 86 Z" fill="none" stroke="var(--foreground)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M98 86 L76 122 M122 86 L146 122" fill="none" stroke="var(--accent)" strokeWidth="8" strokeLinecap="round" />
      <path d="M96 64 L62 78 M124 64 L160 78" fill="none" stroke="var(--blue)" strokeWidth="8" strokeLinecap="round" />
      {kind.includes("squat") || kind.includes("leg") ? <path d="M62 78 H158" stroke="var(--gold)" strokeWidth="6" strokeLinecap="round" /> : null}
      {kind.includes("press") || kind.includes("overhead") ? <path d="M52 52 H168" stroke="var(--gold)" strokeWidth="6" strokeLinecap="round" /> : null}
      {kind.includes("walk") ? <path d="M36 132 C72 104 104 148 146 118 C164 106 178 102 194 102" fill="none" stroke="var(--primary)" strokeWidth="4" strokeDasharray="6 8" /> : null}
    </svg>
  );
}
