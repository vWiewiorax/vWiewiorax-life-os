import { cn } from "@/lib/utils";
import { priorityClass, priorityLabel, type Priority } from "@/lib/labels";

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium", priorityClass(priority), className)}>{priorityLabel(priority)}</span>;
}

export function Pill({ children, className, color }: { children: React.ReactNode; className?: string; color?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground", className)}>
      {color && <span className="size-2 rounded-full" style={{ background: color }} />}
      {children}
    </span>
  );
}
