const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/** Resolve configured API hosts for browser requests, defaulting to the app origin. */
export function publicApiBase(configuredBase: string | undefined): string {
  const configured = configuredBase?.trim().replace(/\/$/, "") || "";
  if (typeof window === "undefined") return configured;

  const appOrigin = window.location.origin;
  if (!configured) return process.env.NODE_ENV === "production" ? appOrigin : "";

  try {
    const target = new URL(configured, appOrigin);
    const browserIsLoopback = LOOPBACK_HOSTS.has(window.location.hostname.toLowerCase());
    if (LOOPBACK_HOSTS.has(target.hostname.toLowerCase()) && !browserIsLoopback) {
      // A localhost URL in a public build points at each visitor's own machine.
      // The gateway exposes the same APIs on the application origin instead.
      return appOrigin;
    }
    return `${target.origin}${target.pathname.replace(/\/$/, "")}`;
  } catch {
    return appOrigin;
  }
}
