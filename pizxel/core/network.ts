/**
 * Network Policy
 *
 * Whether PiZXel may make outbound network requests (emoji CDN fallback,
 * emoji search, ...). Allowed by default for local use; the session server
 * turns it off so visitors can't reach the network through PiZXel.
 *
 * Code that fetches from the network must check isNetworkAllowed() first.
 */

let networkAllowed = true;

export function setNetworkAllowed(allowed: boolean): void {
  networkAllowed = allowed;
}

export function isNetworkAllowed(): boolean {
  return networkAllowed;
}
