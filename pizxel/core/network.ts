/**
 * Network Policy
 *
 * Whether PiZXel may make outbound network requests (emoji CDN fallback,
 * emoji search, apps that fetch). Allowed by default for local use.
 *
 * The session server installs a guard that enforces the policy on every
 * request, whether or not the code checks it first:
 * - public engine: no outbound requests at all;
 * - private engine (ALLOW_NETWORK=true): only hosts on an allowlist, with
 *   requests sent through the egress proxy (HTTPS_PROXY + NODE_USE_ENV_PROXY).
 *
 * All outbound requests must use fetch(). In server mode the http/https
 * modules can't connect anywhere except this machine, because Node's env
 * proxy support (as of Node 22) covers fetch only.
 */

import * as fs from "fs";
// The real module objects (an `import * as` namespace is read-only), so the
// guard can replace their request functions
const httpModule: typeof import("http") = require("http");
const httpsModule: typeof import("https") = require("https");

let networkAllowed = true;
/** Hosts requests may go to ("*.example.com" matches subdomains); null = any */
let allowlist: string[] | null = null;
let guardInstalled = false;

export function setNetworkAllowed(allowed: boolean): void {
  networkAllowed = allowed;
}

export function isNetworkAllowed(): boolean {
  return networkAllowed;
}

/** Restrict requests to these hosts (null: any host, when allowed) */
export function setNetworkAllowlist(hosts: string[] | null): void {
  allowlist = hosts;
}

/**
 * Read an allowlist file: one host per line; "*.example.com" also matches
 * its subdomains; blank lines and "#" comments are ignored
 */
export function readAllowlistFile(filePath: string): string[] {
  return fs
    .readFileSync(filePath, "utf-8")
    .split("\n")
    .map((line) => line.replace(/#.*/, "").trim().toLowerCase())
    .filter((line) => line.length > 0);
}

function hostAllowed(host: string): boolean {
  if (!allowlist) return true;
  host = host.toLowerCase();
  return allowlist.some((entry) =>
    entry.startsWith("*.")
      ? host === entry.slice(2) || host.endsWith(entry.slice(1))
      : host === entry
  );
}

/** Whether a request to this URL is allowed by the policy */
export function isUrlAllowed(url: string | URL): boolean {
  if (!networkAllowed) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    return hostAllowed(parsed.hostname);
  } catch {
    return false;
  }
}

function isLoopback(host: string | null | undefined): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

/**
 * Enforce the policy on fetch() and the http/https modules (server mode)
 */
export function installNetworkGuard(): void {
  if (guardInstalled) return;
  guardInstalled = true;

  const realFetch = globalThis.fetch;
  globalThis.fetch = ((input: any, init?: any) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.href
        : input?.url;
    if (!isUrlAllowed(url)) {
      let host = String(url);
      try {
        host = new URL(url).hostname;
      } catch {}
      return Promise.reject(
        new TypeError(`Network access to ${host} is not allowed`)
      );
    }
    return realFetch(input, init);
  }) as typeof fetch;

  // http/https modules: this machine only
  for (const mod of [httpModule, httpsModule] as any[]) {
    for (const method of ["request", "get"]) {
      const real = mod[method];
      mod[method] = (...args: any[]) => {
        const first = args[0];
        const host =
          typeof first === "string" || first instanceof URL
            ? new URL(first).hostname
            : first?.hostname ?? first?.host ?? "localhost";
        if (!isLoopback(host)) {
          throw new Error(
            `Network access to ${host} is not allowed (use fetch, which follows the network policy)`
          );
        }
        return real.apply(mod, args);
      };
    }
  }
}
