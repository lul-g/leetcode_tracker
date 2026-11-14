import { cn } from "@/lib/utils";

export const APP_NAME = "Pacer";

/** Three difficulty arcs (easy, medium, hard) around an upward chevron. Same artwork as app/icon.svg. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="8" fill="#121212" />
      <g strokeWidth="3.2" strokeLinecap="round">
        <path d="M8.58 23.42A10.5 10.5 0 0 1 7.76 9.49" stroke="var(--easy)" />
        <path d="M9.02 8.16A10.5 10.5 0 0 1 22.98 8.16" stroke="var(--medium)" />
        <path d="M24.24 9.49A10.5 10.5 0 0 1 23.42 23.42" stroke="var(--hard)" />
      </g>
      <path
        d="M11.8 18.2 16 13.6l4.2 4.6"
        stroke="var(--solved)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <div className="flex flex-col leading-none">
        <span className="text-base font-bold tracking-tight">{APP_NAME}</span>
        <span className="mt-1 text-[11px] text-muted-foreground">
          Stay on pace for your goal
        </span>
      </div>
    </div>
  );
}
