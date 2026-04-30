import { StepTimer } from "./StepTimer";
import { cn } from "@/lib/utils";

type Emphasis = { phrase: string; level: "md" | "lg" | "xl" };
export type Step = {
  id: string;
  text: string;
  position: number;
  title?: string | null;
  keywords?: string[] | null;
  emphasis?: Emphasis[] | null;
  timer_seconds?: number | null;
};

const LEVEL_CLASS: Record<Emphasis["level"], string> = {
  md: "font-semibold text-foreground",
  lg: "font-semibold text-foreground text-[1.05em]",
  xl: "font-bold text-foreground text-[1.18em]",
};

/** Render text with phrase-level emphasis (size + weight per level). */
function renderHighlighted(text: string, emphasis: Emphasis[] | null | undefined, fallback: string[] | null | undefined) {
  // Build effective list: use emphasis if present, else flat keywords with default md.
  const list: Emphasis[] = (emphasis && emphasis.length > 0)
    ? emphasis
    : (fallback ?? []).map((k) => ({ phrase: k, level: "md" as const }));
  const cleaned = list.filter((e) => e.phrase && e.phrase.trim().length > 0);
  if (cleaned.length === 0) return <>{text}</>;

  // Sort longest first, build regex, keep level lookup.
  const sorted = [...cleaned].sort((a, b) => b.phrase.length - a.phrase.length);
  const escaped = sorted.map((e) => e.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);

  return (
    <>
      {parts.map((part, i) => {
        const match = sorted.find((e) => e.phrase.toLowerCase() === part.toLowerCase());
        if (!match) return <span key={i}>{part}</span>;
        return (
          <strong key={i} className={LEVEL_CLASS[match.level] ?? LEVEL_CLASS.md}>
            {part}
          </strong>
        );
      })}
    </>
  );
}

type Props = {
  steps: Step[];
  /** When provided, renders an interactive checklist with timers + step highlighting. */
  interactive?: {
    currentStep: number;
    onStepDone: (idx: number) => void;
    timerEndsAt: number | null;
    timerStepIndex: number | null;
    timerRemaining: number | null;
    onTimerChange: (stepIndex: number, next: { endsAt: number | null; remaining: number | null }) => void;
  };
};

export const InstructionList = ({ steps, interactive }: Props) => {
  if (steps.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No steps yet.</p>;
  }
  return (
    <ol className="space-y-7">
      {steps.map((s, i) => (
        <li
          key={s.id}
          className={cn(
            "flex gap-4 rounded-xl p-2 -mx-2 transition-colors",
            interactive && interactive.currentStep === i && "bg-muted/40 ring-1 ring-foreground/10",
          )}
          id={`step-${i}`}
        >
          {interactive ? (
            <button
              type="button"
              onClick={() => interactive.onStepDone(i)}
              className={cn(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                i < interactive.currentStep
                  ? "bg-emerald-600 text-white"
                  : "bg-foreground text-background hover:opacity-80",
              )}
              aria-label={`Mark step ${i + 1} complete`}
            >
              {i < interactive.currentStep ? "✓" : i + 1}
            </button>
          ) : (
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
              {i + 1}
            </span>
          )}
          <div className="flex-1">
            {s.title && (
              <h3 className="mb-1 text-lg font-semibold tracking-tight text-foreground">{s.title}</h3>
            )}
            <p className="text-base leading-relaxed text-foreground/80">
              {renderHighlighted(s.text, s.emphasis, s.keywords)}
            </p>
            {s.timer_seconds && s.timer_seconds > 0 && (
              interactive ? (
                <StepTimer
                  seconds={s.timer_seconds}
                  endsAt={interactive.timerStepIndex === i ? interactive.timerEndsAt : null}
                  remaining={interactive.timerStepIndex === i ? interactive.timerRemaining : null}
                  onChange={(next) => interactive.onTimerChange(i, next)}
                />
              ) : (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
                  ⏱️ Timer: {Math.round(s.timer_seconds / 60)} min
                </p>
              )
            )}
          </div>
        </li>
      ))}
    </ol>
  );
};