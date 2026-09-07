import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";

import { pushStatus, registerPushToken } from "@/lib/push.functions";

/**
 * Registers this browser for push alerts when Firebase messaging is configured
 * on the server. With no configuration it does nothing — in-app alerts still
 * work, and nothing pretends to be delivered.
 */
export function usePushNotifications(enabled: boolean) {
  const status = useServerFn(pushStatus);
  const register = useServerFn(registerPushToken);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      try {
        if (!("serviceWorker" in navigator) || !("Notification" in window)) return;
        const config = await status();
        if (cancelled || !config.configured || !config.vapidKey || !config.firebaseConfig) return;

        const permission =
          Notification.permission === "granted"
            ? "granted"
            : await Notification.requestPermission();
        if (permission !== "granted") return;

        const [{ initializeApp, getApps }, { getMessaging, getToken }] = await Promise.all([
          import("firebase/app"),
          import("firebase/messaging"),
        ]);
        const options = JSON.parse(config.firebaseConfig) as Record<string, string>;
        const app = getApps()[0] ?? initializeApp(options);
        const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        const token = await getToken(getMessaging(app), {
          vapidKey: config.vapidKey,
          serviceWorkerRegistration: registration,
        });
        if (!token || cancelled) return;
        await register({ data: { token, platform: "web" } });
      } catch {
        /* push is best-effort; in-app notifications remain the source of truth */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, register, status]);
}
