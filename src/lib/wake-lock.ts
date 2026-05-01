/** Thin wrapper around the Screen Wake Lock API with reacquire-on-visible. */
export type WakeLockHandle = {
  release: () => Promise<void>;
  active: () => boolean;
};

export function isWakeLockSupported(): boolean {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

export async function requestWakeLock(): Promise<WakeLockHandle | null> {
  if (!isWakeLockSupported()) return null;
  let sentinel: any = null;
  let released = false;

  const acquire = async () => {
    try {
      sentinel = await (navigator as any).wakeLock.request("screen");
      sentinel.addEventListener?.("release", () => {
        sentinel = null;
      });
    } catch (e) {
      console.warn("Wake Lock failed", e);
    }
  };
  await acquire();
  if (!sentinel) return null;

  const onVisible = async () => {
    if (released) return;
    if (document.visibilityState === "visible" && !sentinel) {
      await acquire();
    }
  };
  document.addEventListener("visibilitychange", onVisible);

  return {
    active: () => !!sentinel,
    release: async () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      try { await sentinel?.release?.(); } catch { /* noop */ }
      sentinel = null;
    },
  };
}