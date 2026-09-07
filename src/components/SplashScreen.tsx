import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

/**
 * Branded splash overlay shown on first app load.
 * Renders above all content, animates in, holds briefly, then fades out.
 * Shown once per browser session (sessionStorage) so navigation doesn't repeat it.
 */
const SPLASH_KEY = "spotless-splash-seen";
const HOLD_MS = 1400;
const FADE_MS = 650;

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Respect reduced motion: shorten hold.
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const hold = reduce ? 500 : HOLD_MS;

    const leaveTimer = window.setTimeout(() => setLeaving(true), hold);
    const hideTimer = window.setTimeout(
      () => {
        setVisible(false);
        try {
          sessionStorage.setItem(SPLASH_KEY, "1");
        } catch {
          /* sessionStorage unavailable — ignore */
        }
      },
      hold + FADE_MS,
    );

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  // If already seen this session, render nothing.
  if (typeof window !== "undefined") {
    try {
      if (sessionStorage.getItem(SPLASH_KEY)) return null;
    } catch {
      /* ignore */
    }
  }

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading SqueakClean"
      className={`splash-overlay ${leaving ? "splash-leaving" : ""}`}
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
