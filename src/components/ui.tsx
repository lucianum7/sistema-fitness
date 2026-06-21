import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "primary",
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-[8px] px-4 text-center text-sm font-semibold leading-snug shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55",
        variant === "primary" && "bg-[var(--primary)] text-white hover:bg-[var(--primary-strong)]",
        variant === "secondary" && "border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--surface-strong)]",
        variant === "ghost" && "text-[var(--foreground)] hover:bg-[var(--surface-strong)]",
        variant === "danger" && "bg-[var(--danger)] text-white hover:opacity-90",
        className,
      )}
      {...props}
    />
  );
}

export function LinkButton({
  className,
  variant = "primary",
  ...props
}: ComponentProps<typeof Link> & { variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <Link
      className={cn(
        "inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-[8px] px-4 text-center text-sm font-semibold leading-snug shadow-sm transition active:scale-[0.98]",
        variant === "primary" && "bg-[var(--primary)] text-white hover:bg-[var(--primary-strong)]",
        variant === "secondary" && "border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--surface-strong)]",
        variant === "ghost" && "text-[var(--foreground)] hover:bg-[var(--surface-strong)]",
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("soft-card rounded-[8px] p-5 md:p-6", className)} {...props} />;
}

export function Field({
  label,
  hint,
  ...props
}: ComponentProps<"input"> & { label: string; hint?: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      <input
      className="min-h-10 w-full min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)] px-3 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:bg-[var(--surface)]"
        {...props}
      />
      {hint ? <span className="text-xs font-normal text-[var(--muted)]">{hint}</span> : null}
    </label>
  );
}

export function SelectField({
  label,
  hint,
  children,
  ...props
}: ComponentProps<"select"> & { label: string; hint?: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      <select
        className="min-h-10 w-full min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)] px-3 text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:bg-[var(--surface)]"
        {...props}
      >
        {children}
      </select>
      {hint ? <span className="text-xs font-normal text-[var(--muted)]">{hint}</span> : null}
    </label>
  );
}

export function TextAreaField({
  label,
  hint,
  ...props
}: ComponentProps<"textarea"> & { label: string; hint?: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      <textarea
        className="min-h-24 w-full min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:bg-[var(--surface)]"
        {...props}
      />
      {hint ? <span className="text-xs font-normal text-[var(--muted)]">{hint}</span> : null}
    </label>
  );
}

export function Badge({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1 text-xs font-semibold text-[var(--foreground)]",
        className,
      )}
      {...props}
    />
  );
}

export function HelpTip({ content, label = "Ajuda" }: { content: string; label?: string }) {
  return (
    <span
      aria-label={`${label}: ${content}`}
      className="inline-flex size-5 shrink-0 cursor-help items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-strong)] text-xs font-black text-[var(--muted)]"
      role="note"
      tabIndex={0}
      title={content}
    >
      ?
    </span>
  );
}
