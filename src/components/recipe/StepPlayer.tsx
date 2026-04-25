import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { StepAnimation } from "@/components/animations/CookingAnimations";
import { cn } from "@/lib/utils";

type Step = { id: string; text: string; position: number; animation_key: string | null };

export const StepPlayer = ({ steps }: { steps: Step[] }) => {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  if (steps.length === 0) return <p className="py-10 text-center text-muted-foreground">No steps yet.</p>;
  const current = steps[i];

  const go = (next: number) => {
    if (next < 0 || next >= steps.length) return;
    setDir(next > i ? 1 : -1);
    setI(next);
  };

  return (
    <div className="overflow-hidden rounded-3xl bg-card shadow-card">
      {/* Animation stage */}
      <div className="relative aspect-[16/11] w-full overflow-hidden bg-muted/40">
        <div key={current.id} className={cn("absolute inset-0", dir === 1 ? "animate-slide-in-right" : "animate-slide-in-left")}>
          <StepAnimation stepText={current.text} animationKey={current.animation_key} className="h-full w-full" />
        </div>
        {/* progress dots */}
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {steps.map((_, idx) => (
            <span key={idx} className={cn("h-1.5 rounded-full transition-all", idx === i ? "w-6 bg-primary" : "w-1.5 bg-foreground/20")} />
          ))}
        </div>
      </div>

      {/* Step text */}
      <div className="p-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Step {i + 1} of {steps.length}</p>
        <p key={`t-${current.id}`} className="min-h-[3.5rem] text-lg leading-snug animate-fade-in">{current.text}</p>

        <div className="mt-5 flex items-center gap-3">
          <Button variant="outline" onClick={() => go(i - 1)} disabled={i === 0} className="flex-1">
            <ChevronLeft className="mr-1 h-4 w-4" /> Previous
          </Button>
          <Button onClick={() => go(i + 1)} disabled={i === steps.length - 1} className="flex-1">
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
