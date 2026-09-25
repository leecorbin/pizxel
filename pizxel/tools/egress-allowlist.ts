/**
 * Egress allowlist generator
 *
 * Writes the hosts that apps declare in their manifests ("network" in
 * config.json) as an allowlist file for an egress proxy: one host per line.
 *
 *   npx tsx pizxel/tools/egress-allowlist.ts <apps dir> [--out <file>] [--public]
 *
 * --public lists only public-tier apps (core, optional). Without it, every
 * app in the directory is included (a private instance runs them all).
 */

import * as fs from "fs";
import { AppListing, AppScanner } from "../core/app-scanner";

/** The hosts the given apps declare, sorted and without duplicates */
export function hostsFor(apps: AppListing[]): string[] {
  const hosts = new Set<string>();
  for (const app of apps) {
    for (const host of app.config.network ?? []) {
      if (typeof host === "string" && host.trim()) hosts.add(host.trim().toLowerCase());
    }
  }
  return [...hosts].sort();
}

/** The apps an instance can run: public tiers only, or everything */
export function appsFor(appsDir: string | null, publicOnly: boolean): AppListing[] {
  return new AppScanner(undefined, { userAppsPath: appsDir })
    .listApps()
    .filter((app) => !publicOnly || (app.config.tier ?? "core") !== "private");
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf("--out");
  const out = outIndex >= 0 ? args[outIndex + 1] : null;
  const publicOnly = args.includes("--public");
  const appsDir = args.find((a, i) => !a.startsWith("--") && i !== outIndex + 1) ?? null;

  const apps = appsFor(appsDir, publicOnly);
  const lines = [
    "# Generated from the apps' manifests (\"network\" in config.json) by",
    "# pizxel/tools/egress-allowlist.ts. Don't edit by hand: change the",
    "# manifest and regenerate.",
    "",
  ];
  for (const app of apps) {
    const hosts = app.config.network ?? [];
    if (hosts.length > 0) lines.push(`# ${app.config.name}`, ...hosts, "");
  }
  const text = lines.join("\n");
  if (out) fs.writeFileSync(out, text);
  else process.stdout.write(text);
}
