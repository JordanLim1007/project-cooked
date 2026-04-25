// Hand-crafted SVG cooking animations. No AI. Realistic-leaning illustrated style.
// Each animation is keyed and rendered inside a 320x220 viewBox.

import React from "react";

const Frame: React.FC<React.PropsWithChildren<{ bg?: string }>> = ({ children, bg = "hsl(36 33% 97%)" }) => (
  <svg viewBox="0 0 320 220" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="counter" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="hsl(30 30% 88%)" />
        <stop offset="100%" stopColor="hsl(30 25% 78%)" />
      </linearGradient>
      <linearGradient id="pan" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="hsl(0 0% 25%)" />
        <stop offset="100%" stopColor="hsl(0 0% 8%)" />
      </linearGradient>
      <radialGradient id="liquid" cx="0.5" cy="0.5">
        <stop offset="0%" stopColor="hsl(28 80% 65%)" />
        <stop offset="100%" stopColor="hsl(13 60% 45%)" />
      </radialGradient>
      <linearGradient id="water" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="hsl(200 60% 80%)" />
        <stop offset="100%" stopColor="hsl(210 60% 55%)" />
      </linearGradient>
      <linearGradient id="wood" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stopColor="hsl(28 40% 55%)" />
        <stop offset="100%" stopColor="hsl(28 40% 40%)" />
      </linearGradient>
    </defs>
    <rect width="320" height="220" fill={bg} />
    <rect y="170" width="320" height="50" fill="url(#counter)" />
    {children}
  </svg>
);

const Steam = ({ x, delay = 0 }: { x: number; delay?: number }) => (
  <g style={{ animationDelay: `${delay}s` }} className="animate-steam-rise origin-center">
    <ellipse cx={x} cy="60" rx="6" ry="10" fill="hsl(0 0% 100%)" opacity="0.7" />
  </g>
);

// --- Individual animations ---

export const CutAnimation = () => (
  <Frame>
    {/* cutting board */}
    <rect x="60" y="150" width="200" height="22" rx="4" fill="url(#wood)" />
    {/* cucumber */}
    <ellipse cx="160" cy="148" rx="55" ry="10" fill="hsl(105 35% 45%)" />
    <ellipse cx="160" cy="146" rx="48" ry="6" fill="hsl(105 40% 55%)" />
    {/* slice marks */}
    <line x1="135" y1="140" x2="135" y2="156" stroke="hsl(105 25% 30%)" strokeWidth="1.5" />
    <line x1="150" y1="140" x2="150" y2="156" stroke="hsl(105 25% 30%)" strokeWidth="1.5" />
    <line x1="170" y1="140" x2="170" y2="156" stroke="hsl(105 25% 30%)" strokeWidth="1.5" />
    {/* knife */}
    <g className="animate-knife-chop origin-bottom" style={{ transformOrigin: "190px 150px" }}>
      <polygon points="120,80 200,140 200,150 120,90" fill="hsl(0 0% 85%)" stroke="hsl(0 0% 50%)" strokeWidth="1" />
      <rect x="195" y="135" width="35" height="14" rx="3" fill="hsl(28 50% 25%)" />
    </g>
  </Frame>
);

export const FryAnimation = () => (
  <Frame>
    {/* stove */}
    <rect x="80" y="155" width="160" height="20" rx="3" fill="hsl(0 0% 20%)" />
    {/* flame */}
    <ellipse cx="160" cy="168" rx="40" ry="8" fill="hsl(20 90% 55%)" opacity="0.7" />
    <ellipse cx="160" cy="170" rx="30" ry="5" fill="hsl(50 100% 60%)" opacity="0.8" />
    {/* pan */}
    <g className="animate-pan-shake origin-center" style={{ transformOrigin: "160px 145px" }}>
      <ellipse cx="160" cy="148" rx="75" ry="12" fill="url(#pan)" />
      <rect x="85" y="140" width="150" height="10" rx="2" fill="url(#pan)" />
      <rect x="225" y="142" width="60" height="6" rx="3" fill="hsl(28 50% 25%)" />
      {/* food in pan */}
      <circle cx="140" cy="142" r="10" fill="hsl(28 70% 55%)" />
      <circle cx="165" cy="140" r="9" fill="hsl(28 75% 50%)" />
      <circle cx="185" cy="143" r="11" fill="hsl(28 70% 58%)" />
    </g>
    <Steam x={140} />
    <Steam x={170} delay={0.7} />
    <Steam x={195} delay={1.4} />
  </Frame>
);

export const BoilAnimation = () => (
  <Frame>
    {/* stove */}
    <rect x="100" y="160" width="120" height="18" rx="3" fill="hsl(0 0% 22%)" />
    <ellipse cx="160" cy="172" rx="30" ry="6" fill="hsl(20 90% 55%)" opacity="0.7" />
    {/* pot */}
    <path d="M105 100 L110 158 Q110 165 118 165 L202 165 Q210 165 210 158 L215 100 Z" fill="hsl(0 0% 35%)" />
    <ellipse cx="160" cy="100" rx="55" ry="10" fill="url(#water)" />
    {/* handles */}
    <rect x="80" y="115" width="28" height="6" rx="3" fill="hsl(0 0% 25%)" />
    <rect x="212" y="115" width="28" height="6" rx="3" fill="hsl(0 0% 25%)" />
    {/* bubbles */}
    <circle className="animate-bubble" cx="140" cy="100" r="4" fill="hsl(0 0% 100%)" opacity="0.8" />
    <circle className="animate-bubble" cx="165" cy="100" r="5" fill="hsl(0 0% 100%)" opacity="0.8" style={{ animationDelay: "0.5s" }} />
    <circle className="animate-bubble" cx="185" cy="100" r="3" fill="hsl(0 0% 100%)" opacity="0.8" style={{ animationDelay: "1s" }} />
    <Steam x={150} />
    <Steam x={175} delay={0.8} />
  </Frame>
);

export const MixAnimation = () => (
  <Frame>
    {/* bowl */}
    <ellipse cx="160" cy="150" rx="80" ry="14" fill="hsl(0 0% 25%)" />
    <path d="M82 145 Q82 180 160 188 Q238 180 238 145 Z" fill="hsl(0 0% 90%)" />
    <ellipse cx="160" cy="145" rx="78" ry="10" fill="url(#liquid)" />
    {/* spoon */}
    <g className="animate-stir-spin origin-center" style={{ transformOrigin: "160px 145px" }}>
      <rect x="158" y="60" width="6" height="80" rx="2" fill="hsl(28 50% 35%)" />
      <ellipse cx="161" cy="148" rx="14" ry="8" fill="hsl(28 50% 40%)" />
    </g>
  </Frame>
);

export const PourAnimation = () => (
  <Frame>
    {/* glass / bowl */}
    <path d="M110 110 L120 168 L200 168 L210 110 Z" fill="hsl(200 30% 90%)" opacity="0.7" stroke="hsl(0 0% 70%)" strokeWidth="1.5" />
    <ellipse cx="160" cy="115" rx="50" ry="6" fill="url(#liquid)" />
    {/* bottle tilted */}
    <g transform="rotate(-30 80 70)">
      <rect x="55" y="40" width="50" height="80" rx="6" fill="hsl(13 40% 45%)" />
      <rect x="68" y="20" width="24" height="22" rx="3" fill="hsl(13 40% 30%)" />
    </g>
    {/* stream */}
    <rect className="animate-pour-drop" x="105" y="80" width="6" height="20" fill="url(#liquid)" rx="3" />
    <rect className="animate-pour-drop" x="105" y="80" width="6" height="20" fill="url(#liquid)" rx="3" style={{ animationDelay: "0.4s" }} />
    <rect className="animate-pour-drop" x="105" y="80" width="6" height="20" fill="url(#liquid)" rx="3" style={{ animationDelay: "0.8s" }} />
  </Frame>
);

export const BakeAnimation = () => (
  <Frame>
    {/* oven */}
    <rect x="60" y="60" width="200" height="115" rx="8" fill="hsl(0 0% 25%)" />
    <rect x="75" y="75" width="170" height="80" rx="4" fill="hsl(20 70% 35%)" opacity="0.6" />
    <rect x="75" y="75" width="170" height="80" rx="4" fill="none" stroke="hsl(0 0% 50%)" strokeWidth="2" />
    {/* pie inside */}
    <ellipse cx="160" cy="135" rx="40" ry="8" fill="hsl(28 60% 55%)" />
    <ellipse cx="160" cy="130" rx="40" ry="14" fill="hsl(28 70% 65%)" />
    <path d="M125 125 Q160 110 195 125" stroke="hsl(28 50% 40%)" strokeWidth="2" fill="none" />
    {/* knobs */}
    <circle cx="85" cy="50" r="6" fill="hsl(0 0% 60%)" />
    <circle cx="160" cy="50" r="6" fill="hsl(0 0% 60%)" />
    <circle cx="235" cy="50" r="6" fill="hsl(13 60% 50%)" className="animate-pulse" />
    {/* heat waves */}
    <Steam x={130} />
    <Steam x={160} delay={0.6} />
    <Steam x={190} delay={1.2} />
  </Frame>
);

export const ChopAnimation = () => (
  <Frame>
    <rect x="60" y="150" width="200" height="22" rx="4" fill="url(#wood)" />
    {/* onion halves */}
    <ellipse cx="130" cy="148" rx="22" ry="14" fill="hsl(45 60% 85%)" />
    <ellipse cx="130" cy="148" rx="16" ry="10" fill="hsl(45 50% 78%)" />
    <ellipse cx="190" cy="148" rx="22" ry="14" fill="hsl(45 60% 85%)" />
    <ellipse cx="190" cy="148" rx="16" ry="10" fill="hsl(45 50% 78%)" />
    <g className="animate-knife-chop" style={{ transformOrigin: "210px 150px" }}>
      <polygon points="130,75 215,140 215,150 130,85" fill="hsl(0 0% 88%)" stroke="hsl(0 0% 55%)" strokeWidth="1" />
      <rect x="210" y="135" width="38" height="14" rx="3" fill="hsl(28 50% 25%)" />
    </g>
  </Frame>
);

export const SeasonAnimation = () => (
  <Frame>
    {/* dish */}
    <ellipse cx="160" cy="160" rx="80" ry="14" fill="hsl(0 0% 25%)" />
    <ellipse cx="160" cy="155" rx="78" ry="12" fill="hsl(0 0% 95%)" />
    <ellipse cx="160" cy="153" rx="60" ry="8" fill="hsl(28 70% 55%)" />
    {/* shaker */}
    <g transform="translate(140 30) rotate(20)">
      <rect x="0" y="20" width="40" height="50" rx="6" fill="hsl(0 0% 95%)" stroke="hsl(0 0% 70%)" strokeWidth="1.5" />
      <rect x="5" y="10" width="30" height="14" rx="3" fill="hsl(0 0% 60%)" />
      <circle cx="12" cy="16" r="1.5" fill="hsl(0 0% 30%)" />
      <circle cx="20" cy="16" r="1.5" fill="hsl(0 0% 30%)" />
      <circle cx="28" cy="16" r="1.5" fill="hsl(0 0% 30%)" />
    </g>
    {/* falling salt */}
    <circle className="animate-season-fall" cx="158" cy="100" r="2" fill="hsl(0 0% 95%)" />
    <circle className="animate-season-fall" cx="168" cy="100" r="2" fill="hsl(0 0% 95%)" style={{ animationDelay: "0.3s" }} />
    <circle className="animate-season-fall" cx="178" cy="100" r="2" fill="hsl(0 0% 95%)" style={{ animationDelay: "0.6s" }} />
    <circle className="animate-season-fall" cx="150" cy="100" r="2" fill="hsl(0 0% 95%)" style={{ animationDelay: "0.9s" }} />
  </Frame>
);

export const SteamAnimation = () => (
  <Frame>
    {/* steamer basket */}
    <rect x="100" y="140" width="120" height="30" rx="4" fill="hsl(28 30% 65%)" />
    <rect x="100" y="135" width="120" height="6" fill="hsl(28 30% 50%)" />
    {[...Array(6)].map((_, i) => (
      <line key={i} x1={108 + i * 18} y1="145" x2={108 + i * 18} y2="168" stroke="hsl(28 25% 40%)" strokeWidth="1.5" />
    ))}
    {/* dumplings */}
    <ellipse cx="130" cy="138" rx="12" ry="6" fill="hsl(36 60% 88%)" />
    <ellipse cx="160" cy="138" rx="12" ry="6" fill="hsl(36 60% 88%)" />
    <ellipse cx="190" cy="138" rx="12" ry="6" fill="hsl(36 60% 88%)" />
    <Steam x={130} />
    <Steam x={160} delay={0.5} />
    <Steam x={190} delay={1} />
    <Steam x={145} delay={1.5} />
  </Frame>
);

export const ServeAnimation = () => (
  <Frame>
    {/* plate */}
    <ellipse cx="160" cy="155" rx="100" ry="18" fill="hsl(0 0% 30%)" />
    <ellipse cx="160" cy="150" rx="98" ry="16" fill="hsl(0 0% 98%)" />
    <ellipse cx="160" cy="148" rx="80" ry="12" fill="hsl(0 0% 92%)" />
    {/* food */}
    <g className="animate-float origin-center" style={{ transformOrigin: "160px 130px" }}>
      <ellipse cx="160" cy="135" rx="50" ry="14" fill="hsl(28 70% 55%)" />
      <ellipse cx="145" cy="128" rx="14" ry="8" fill="hsl(105 35% 45%)" />
      <ellipse cx="170" cy="125" rx="12" ry="7" fill="hsl(13 60% 50%)" />
      <ellipse cx="180" cy="132" rx="10" ry="6" fill="hsl(45 80% 60%)" />
    </g>
    <Steam x={150} />
    <Steam x={175} delay={0.7} />
  </Frame>
);

export const WhiskAnimation = () => (
  <Frame>
    {/* bowl */}
    <ellipse cx="160" cy="155" rx="85" ry="14" fill="hsl(0 0% 28%)" />
    <path d="M77 150 Q77 185 160 192 Q243 185 243 150 Z" fill="hsl(0 0% 92%)" />
    <ellipse cx="160" cy="150" rx="83" ry="10" fill="hsl(45 70% 80%)" />
    {/* whisk */}
    <g className="animate-stir-spin" style={{ transformOrigin: "160px 145px" }}>
      <rect x="158" y="50" width="5" height="90" rx="2" fill="hsl(0 0% 75%)" />
      <ellipse cx="161" cy="148" rx="16" ry="14" fill="none" stroke="hsl(0 0% 80%)" strokeWidth="1.5" />
      <line x1="161" y1="135" x2="161" y2="160" stroke="hsl(0 0% 80%)" strokeWidth="1.5" />
      <line x1="148" y1="148" x2="174" y2="148" stroke="hsl(0 0% 80%)" strokeWidth="1.5" />
    </g>
  </Frame>
);

export const RestAnimation = () => (
  <Frame>
    {/* clock */}
    <circle cx="160" cy="105" r="60" fill="hsl(0 0% 98%)" stroke="hsl(13 53% 53%)" strokeWidth="4" />
    <circle cx="160" cy="105" r="3" fill="hsl(20 25% 14%)" />
    {[12, 3, 6, 9].map((h, i) => {
      const angles = [0, 90, 180, 270];
      const a = (angles[i] - 90) * (Math.PI / 180);
      return <text key={h} x={160 + Math.cos(a) * 45} y={105 + Math.sin(a) * 45 + 5} textAnchor="middle" fontSize="14" fontWeight="600" fill="hsl(20 25% 14%)">{h}</text>;
    })}
    {/* hands */}
    <line x1="160" y1="105" x2="160" y2="70" stroke="hsl(20 25% 14%)" strokeWidth="3" strokeLinecap="round" className="animate-spin origin-center" style={{ transformOrigin: "160px 105px", animationDuration: "3s" }} />
    <line x1="160" y1="105" x2="185" y2="105" stroke="hsl(13 53% 53%)" strokeWidth="2" strokeLinecap="round" />
  </Frame>
);

// --- Animation registry & keyword mapping ---

export const ANIMATION_REGISTRY: Record<string, React.FC> = {
  cut: CutAnimation,
  chop: ChopAnimation,
  fry: FryAnimation,
  boil: BoilAnimation,
  mix: MixAnimation,
  whisk: WhiskAnimation,
  pour: PourAnimation,
  bake: BakeAnimation,
  season: SeasonAnimation,
  steam: SteamAnimation,
  serve: ServeAnimation,
  rest: RestAnimation,
};

const KEYWORD_MAP: { keys: string[]; animation: string }[] = [
  { keys: ["chop", "dice", "mince"], animation: "chop" },
  { keys: ["cut", "slice", "cube", "julienne"], animation: "cut" },
  { keys: ["whisk", "beat", "whip"], animation: "whisk" },
  { keys: ["mix", "stir", "combine", "fold", "blend", "toss"], animation: "mix" },
  { keys: ["pour", "drizzle", "add liquid", "add water", "add oil", "add stock"], animation: "pour" },
  { keys: ["fry", "sear", "saute", "sauté", "brown", "cook in pan", "stir-fry", "stir fry"], animation: "fry" },
  { keys: ["boil", "simmer", "reduce", "cook in water"], animation: "boil" },
  { keys: ["bake", "roast", "oven"], animation: "bake" },
  { keys: ["steam"], animation: "steam" },
  { keys: ["season", "salt", "pepper", "sprinkle", "garnish"], animation: "season" },
  { keys: ["serve", "plate", "dish up"], animation: "serve" },
  { keys: ["rest", "wait", "let sit", "marinate", "chill", "cool"], animation: "rest" },
];

export function pickAnimationKey(stepText: string, override?: string | null): string {
  if (override && ANIMATION_REGISTRY[override]) return override;
  const lower = stepText.toLowerCase();
  for (const { keys, animation } of KEYWORD_MAP) {
    if (keys.some(k => lower.includes(k))) return animation;
  }
  return "mix";
}

export const StepAnimation: React.FC<{ stepText: string; animationKey?: string | null; className?: string }> = ({ stepText, animationKey, className }) => {
  const key = pickAnimationKey(stepText, animationKey);
  const Comp = ANIMATION_REGISTRY[key] ?? MixAnimation;
  return (
    <div className={className}>
      <Comp />
    </div>
  );
};
