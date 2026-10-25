/** Compare against the incoming host, not Next's rewritten internal URL. */
export function isSameOriginRequest(request: Request, configuredAppUrl?: string) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const browserOrigin = new URL(origin);
    if (browserOrigin.origin !== origin) return false;
    const internalUrl = new URL(request.url);
    const host = request.headers.get("host");
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
    const protocol = forwardedProto === "https" || forwardedProto === "http" ? `${forwardedProto}:` : internalUrl.protocol;
    const incomingOrigin = host ? new URL(`${protocol}//${host}`).origin : internalUrl.origin;
    if (origin === incomingOrigin) return true;

    // A proxy may replace Host with an internal address. Trust its forwarded
    // host only when it matches the explicitly configured public app origin.
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
    return Boolean(configuredAppUrl && forwardedHost &&
      new URL(configuredAppUrl).origin === origin &&
      new URL(`${protocol}//${forwardedHost}`).origin === origin);
  } catch {
    return false;
  }
}
