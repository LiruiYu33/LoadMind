import { Truck } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadMindLoader({
  label = "LoadMind",
  detail,
  compact = false,
  className,
}: {
  label?: string;
  detail?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(compact ? "flex items-center justify-center px-6 py-5" : "flex h-screen items-center justify-center bg-surface px-6", className)}>
      <div className={cn("flex w-full flex-col items-center", compact ? "max-w-[18rem] gap-3" : "max-w-xs gap-5")}>
        <div className={cn("relative w-full overflow-hidden", compact ? "h-14" : "h-20")} aria-hidden="true">
          <div className={cn("absolute bg-primary/20", compact ? "inset-x-10 bottom-4 h-px" : "inset-x-8 bottom-5 h-px")} />
          <div className={cn("absolute animate-loadmind-track rounded-full opacity-70 [background:repeating-linear-gradient(90deg,hsl(var(--primary)/0.28)_0_10px,transparent_10px_18px)]", compact ? "inset-x-10 bottom-3 h-1.5" : "inset-x-8 bottom-4 h-2")} />
          <div className={cn("absolute left-1/2 flex animate-loadmind-drive items-end gap-1", compact ? "top-2 -ml-8" : "top-4 -ml-10")}>
            <div className={cn("rounded-[4px] bg-primary/20", compact ? "h-5 w-6" : "h-7 w-8")} />
            <div className={cn("grid place-items-center rounded-md text-primary-foreground lift-shadow", compact ? "h-8 w-8" : "h-10 w-10")} style={{ background: "var(--gradient-primary)" }}>
              <Truck className={compact ? "h-4 w-4" : "h-5 w-5"} />
            </div>
            <div className={cn("rounded-[4px] bg-primary/20", compact ? "h-5 w-6" : "h-7 w-8")} />
          </div>
        </div>
        <div className="text-center">
          <div className={cn("font-display font-bold leading-tight", compact ? "text-sm" : "text-base")}>{label}</div>
          {detail && <div className="mt-0.5 text-xs text-muted-foreground">{detail}</div>}
          <div className={cn("mx-auto mt-2 h-1 overflow-hidden rounded-full bg-primary/10", compact ? "w-20" : "w-24")}>
            <div className="h-full w-1/2 animate-loadmind-progress rounded-full bg-action" />
          </div>
        </div>
      </div>
    </div>
  );
}
