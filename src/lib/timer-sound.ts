/** Tiny synthesizer-based "ding" using WebAudio so we don't ship an asset. */
const MUTE_KEY = "cooked.timerSound.muted";

export function isMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}

export function setMuted(v: boolean) {
  try { localStorage.setItem(MUTE_KEY, v ? "1" : "0"); } catch { /* noop */ }
}

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

/** Plays a longer ascending-then-repeating chime (~6 seconds). Safe to call from background tabs. */
export async function playTimerSound() {
  if (isMuted()) return;
  const ac = getCtx();
  if (!ac) return;
  try {
    if (ac.state === "suspended") await ac.resume();
  } catch { /* ignore */ }
  const now = ac.currentTime;
  // Ascending chime, repeated 4 times for a noticeable ~6s alert.
  const pattern = [880, 1108.73, 1318.51];
  const reps = 4;
  const noteSpacing = 0.18;
  const repeatGap = 0.45;
  for (let r = 0; r < reps; r++) {
    const repStart = now + r * (pattern.length * noteSpacing + repeatGap);
    pattern.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      const start = repStart + i * noteSpacing;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.28, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
      osc.connect(gain).connect(ac.destination);
      osc.start(start);
      osc.stop(start + 0.5);
    });
  }
}