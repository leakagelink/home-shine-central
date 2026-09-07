/* global importScripts, firebase */
// Background push handler. The Firebase web config arrives as a query
// parameter when the app registers this worker, so no keys are hardcoded.
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

try {
  const params = new URL(self.location.href).searchParams;
  const config = JSON.parse(params.get("config") || "{}");
  if (config.apiKey) {
    firebase.initializeApp(config);
    firebase.messaging();
  }
} catch (error) {
  // Nothing to do: without a valid config there is no background messaging.
}
