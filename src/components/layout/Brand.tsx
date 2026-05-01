import { Link } from "react-router-dom";
import { ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

/** App wordmark + tagline. Centralised so we only rename in one place. */
export function Brand({ withTagline = false, className }: { withTagline?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full gradient-warm shadow-card">
        <ChefHat className="h-5 w-5 text-primary-foreground" />
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span className="font-heading text-xl font-bold tracking-tight">Cooked</span>
        {withTagline && (
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            find it. cook it. share it.
          </span>
        )}
      </span>
    </Link>
  );
}