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

/** Plays a 3-note ascending chime. Safe to call from background tabs. */
export async function playTimerSound() {
  if (isMuted()) return;
  const ac = getCtx();
  if (!ac) return;
  try {
    if (ac.state === "suspended") await ac.resume();
  } catch { /* ignore */ }
  const now = ac.currentTime;
  const notes = [880, 1108.73, 1318.51];
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    const start = now + i * 0.18;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + 0.45);
  });
}