import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Timer } from "lucide-react";
import { formatClock } from "@/lib/format-time";
import { playTimerSound } from "@/lib/timer-sound";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Props = {
  seconds: number;
  /** Persisted state: endsAt = running until epoch ms; remaining = paused with N seconds left. */
  endsAt: number | null;
  remaining?: number | null;
  onChange: (next: { endsAt: number | null; remaining: number | null }) => void;
  /** Context for the notification center entry. */
  recipeId?: string;
  recipeTitle?: string;
  stepIndex?: number;
  stepTitle?: string;
};

export function StepTimer({ seconds, endsAt, remaining: pausedRemaining, onChange, recipeId, recipeTitle, stepIndex, stepTitle }: Props) {
  const { user } = useAuth();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [endsAt]);

  const remaining = endsAt
    ? Math.max(0, Math.round((endsAt - now) / 1000))
    : (pausedRemaining ?? seconds);
  const running = !!endsAt && remaining > 0;
  const done = !!endsAt && remaining === 0;

  const firedRef = useRef<number | null>(null);
  useEffect(() => {
    if (done && endsAt && firedRef.current !== endsAt) {
      firedRef.current = endsAt;
      playTimerSound();
      const stepNum = (stepIndex ?? 0) + 1;
      const label = stepTitle ? `Step ${stepNum}: ${stepTitle}` : `Step ${stepNum}`;
      toast("Timer finished! Check your recipe step.", {
        description: recipeTitle ? `${recipeTitle} — ${label}` : label,
      });
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          new Notification("Timer finished", {
            body: recipeTitle ? `${recipeTitle} — ${label}` : "Your cooking timer is done.",
          });
        } catch { /* noop */ }
      }
      // Record in the in-app notification center so it survives navigation.
      if (user && recipeId) {
        supabase.from("notifications").insert({
          user_id: user.id,
          recipe_id: recipeId,
          type: "timer_done",
          data: {
            title: recipeTitle ?? null,
            stepIndex: stepIndex ?? null,
            stepNumber: stepNum,
            stepTitle: stepTitle ?? null,
            durationSeconds: seconds,
            completedAt: new Date(endsAt).toISOString(),
          },
        }).then(({ error }) => { if (error) console.error("notif insert", error); });
      }
    }
  }, [done, endsAt, user, recipeId, recipeTitle, stepIndex, stepTitle, seconds]);

  return (
    <div className="mt-3 inline-flex items-center gap-3 rounded-full border border-border bg-muted/40 py-1.5 pl-3 pr-1.5 text-sm">
      <Timer className="h-4 w-4 text-muted-foreground" />
      <span className="tabular-nums font-medium">
        {done ? "Done!" : formatClock(remaining)}
      </span>
      <div className="flex items-center gap-1">
        {running ? (
          <button
            type="button"
            onClick={() => onChange({ endsAt: null, remaining })}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-background shadow-sm transition-transform hover:scale-105"
            aria-label="Pause timer"
          >
            <Pause className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onChange({ endsAt: Date.now() + remaining * 1000, remaining: null })}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background shadow-sm transition-transform hover:scale-105"
            aria-label={done ? "Restart timer" : "Start timer"}
          >
            <Play className="h-3.5 w-3.5" />
          </button>
        )}
        {(endsAt || done || (pausedRemaining != null && pausedRemaining !== seconds)) && (
          <button
            type="button"
            onClick={() => onChange({ endsAt: null, remaining: null })}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-background shadow-sm transition-transform hover:scale-105"
            aria-label="Reset timer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}