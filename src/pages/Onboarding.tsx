import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CUISINES, COOKING_STYLES, SPICE_LEVELS, TIME_PREFERENCES } from "@/lib/recipe-options";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChefHat, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "cuisines", title: "Which cuisines do you love?", subtitle: "Pick a few favorites", multi: true, options: CUISINES },
  { key: "cooking_styles", title: "How do you like to cook?", subtitle: "Pick all that apply", multi: true, options: COOKING_STYLES },
  { key: "spice_level", title: "Spice tolerance?", subtitle: "Pick one", multi: false, options: SPICE_LEVELS },
  { key: "time_preference", title: "How much time do you usually have?", subtitle: "Pick one", multi: false, options: TIME_PREFERENCES },
] as const;

const STORAGE_KEY = "cooked.preferences.draft";

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({
    cuisines: [], cooking_styles: [], spice_level: "", time_preference: "",
  });

  useEffect(() => {
    const draft = localStorage.getItem(STORAGE_KEY);
    if (draft) try { setAnswers(JSON.parse(draft)); } catch {}
  }, []);

  const current = STEPS[step];
  const value = answers[current.key];
  const canNext = current.multi ? Array.isArray(value) && value.length > 0 : !!value;

  const toggle = (opt: string) => {
    setAnswers(prev => {
      const next = { ...prev };
      if (current.multi) {
        const arr = Array.isArray(prev[current.key]) ? (prev[current.key] as string[]) : [];
        next[current.key] = arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt];
      } else {
        next[current.key] = opt;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleNext = async () => {
    if (step < STEPS.length - 1) { setStep(step + 1); return; }
    // Final step: save or prompt to sign in
    if (!user) {
      // Ask user to sign in to save
      toast.info("Sign in to save your preferences");
      navigate("/auth");
      return;
    }
    const { error } = await supabase.from("user_preferences").upsert({
      user_id: user.id,
      cuisines: answers.cuisines as string[],
      cooking_styles: answers.cooking_styles as string[],
      spice_level: answers.spice_level as string,
      time_preference: answers.time_preference as string,
    });
    if (error) { toast.error(error.message); return; }
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem("cooked.onboarded", "1");
    toast.success("Preferences saved!");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full gradient-warm">
            <ChefHat className="h-4 w-4 text-primary-foreground" />
          </span>
          <span className="font-heading text-xl font-bold">COOKED</span>
        </div>
        <button
          onClick={() => {
            localStorage.setItem("cooked.onboarded", "1");
            localStorage.removeItem(STORAGE_KEY);
            navigate("/", { replace: true });
          }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Skip
        </button>
      </header>

      <div className="mx-auto max-w-md px-5">
        {/* progress */}
        <div className="mb-6 flex gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
          ))}
        </div>

        <div key={step} className="animate-fade-in">
          <h1 className="mb-2 text-3xl">{current.title}</h1>
          <p className="mb-8 text-muted-foreground">{current.subtitle}</p>

          <div className="grid grid-cols-2 gap-3">
            {current.options.map(opt => {
              const selected = current.multi
                ? Array.isArray(value) && value.includes(opt)
                : value === opt;
              return (
                <button
                  key={opt}
                  onClick={() => toggle(opt)}
                  className={cn(
                    "relative rounded-2xl border-2 p-4 text-left text-sm font-medium transition-all",
                    selected ? "border-primary bg-primary/5 shadow-card" : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  {opt}
                  {selected && (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background p-4">
          <div className="mx-auto flex max-w-md gap-3">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1" size="lg">Back</Button>
            )}
            <Button onClick={handleNext} disabled={!canNext} className="flex-[2]" size="lg">
              {step === STEPS.length - 1 ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
