import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

/**
 * Branded splash overlay shown on first app load.
 * The fade-out is driven entirely by CSS animation (robust against remounts/HMR);
 * a best-effort JS timer unmounts the node afterward and records the session flag.
 */
const SPLASH_KEY = "spotless-splash-seen";
const HOLD_MS = 1400;
const FADE_MS = 650;

export function SplashScreen() {
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const hold = reduce ? 500 : HOLD_MS;
    const total = hold + FADE_MS + 120;

    const timer = window.setTimeout(() => {
      setMounted(false);
      try {
        sessionStorage.setItem(SPLASH_KEY, "1");
      } catch {
        /* ignore */
      }
    }, total);

    return () => window.clearTimeout(timer);
  }, []);

  // Skip entirely if already shown this session.
  if (typeof window !== "undefined") {
    try {
      if (sessionStorage.getItem(SPLASH_KEY)) return null;
    } catch {
      /* ignore */
    }
  }

  if (!mounted) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading SqueakClean"
      className="splash-overlay"
    >
      <div className="splash-inner">
        <div className="splash-logo">
          <span className="brand-mark splash-mark inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="h-8 w-8" aria-hidden="true" />
          </span>
          <span className="splash-ring" aria-hidden="true" />
          <span className="splash-ring splash-ring-2" aria-hidden="true" />
        </div>
        <div className="splash-wordmark">
          <span className="splash-title font-display">SqueakClean</span>
          <span className="splash-tagline">Pristine spaces, effortless living</span>
        </div>
        <div className="splash-loader" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}
