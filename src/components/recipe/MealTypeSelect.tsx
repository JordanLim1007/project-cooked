import { MEAL_TYPES } from "@/lib/recipe-options";
import { cn } from "@/lib/utils";

/** Multi-select chips for meal types. */
export function MealTypeSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (m: string) => {
    const has = value.includes(m);
    onChange(has ? value.filter((x) => x !== m) : [...value, m]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {MEAL_TYPES.map((m) => {
        const active = value.includes(m);
        return (
          <button
            key={m}
            type="button"
            onClick={() => toggle(m)}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:border-foreground/30",
            )}
          >
            {m}
          </button>
        );
      })}
    </div>
  );
}