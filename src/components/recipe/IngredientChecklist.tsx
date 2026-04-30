import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChecklistIngredient = {
  id: string;
  name: string;
  quantity: string | null;
  is_optional: boolean;
};

type Props = {
  ingredients: ChecklistIngredient[];
  checkedIds: string[];
  onToggle: (id: string) => void;
};

export function IngredientChecklist({ ingredients, checkedIds, onToggle }: Props) {
  if (ingredients.length === 0) return null;
  const checked = new Set(checkedIds);
  const required = ingredients.filter((i) => !i.is_optional);
  const missing = required.filter((i) => !checked.has(i.id));
  const ready = required.length > 0 && missing.length === 0;

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {ingredients.map((ing) => {
          const isChecked = checked.has(ing.id);
          return (
            <li key={ing.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg p-2 -mx-2 transition-colors hover:bg-muted/50",
                  isChecked && "opacity-60",
                )}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => onToggle(ing.id)}
                  className="mt-1"
                />
                <span className="flex-1 text-base leading-snug">
                  {ing.quantity && <strong className="font-semibold">{ing.quantity} </strong>}
                  <span className={cn("text-foreground/80", isChecked && "line-through")}>{ing.name}</span>
                  {ing.is_optional && (
                    <span className="ml-2 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Optional
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {ready ? (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-300/50 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-700/40 dark:bg-emerald-950/40 dark:text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>You're ready to start cooking!</span>
        </div>
      ) : missing.length > 0 ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300/50 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700/40 dark:bg-amber-950/40 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Missing: <strong className="font-semibold">{missing.map((m) => m.name).join(", ")}</strong>
          </span>
        </div>
      ) : null}
    </div>
  );
}