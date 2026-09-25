/**
 * Network Policy Test
 *
 * The server-mode guard must block every outbound request that the policy
 * doesn't allow, whether it uses fetch or the http/https modules, and allow
 * only allowlisted hosts on a private instance.
 *
 * Run: npx tsx tests/network-test.ts (in its own process: it patches globals)
 */

import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import * as os from "os";
import * as path from "path";
import type { AddressInfo } from "net";
import {
  installNetworkGuard,
  isUrlAllowed,
  readAllowlistFile,
  setNetworkAllowed,
  setNetworkAllowlist,
} from "../pizxel/core/network";

function assert(condition: any, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
  console.log(`  ✓ ${message}`);
}

async function rejects(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error: any) {
    return String(error?.message ?? error);
  }
}

async function main() {
  // A local server to stand in for an allowed host
  const server = http.createServer((_req, res) => res.end("ok"));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;

  installNetworkGuard();

  console.log("Public engine (offline)");
  setNetworkAllowed(false);
  setNetworkAllowlist(null);
  const blocked = await rejects(fetch("https://wttr.in/London"));
  assert(blocked?.includes("not allowed"), "fetch to the internet is blocked");
  let threw = "";
  try {
    https.get("https://newsapi.org/v2/top-headlines");
  } catch (error: any) {
    threw = error.message;
  }
  assert(threw.includes("not allowed"), "the https module can't reach the internet");
  const local = await new Promise<string>((resolve, reject) =>
    http.get(`http://127.0.0.1:${port}/`, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve(body));
    }).on("error", reject)
  );
  assert(local === "ok", "http to this machine still works");

  console.log("Private engine (allowlist)");
  const listFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pizxel-net-")), "egress-allowlist.txt");
  fs.writeFileSync(listFile, "# comment\nlocalhost\n\n*.example.com  # subdomains\n");
  const hosts = readAllowlistFile(listFile);
  assert(hosts.join(",") === "localhost,*.example.com", "the allowlist file is parsed");
  setNetworkAllowed(true);
  setNetworkAllowlist(hosts);
  const response = await fetch(`http://localhost:${port}/`);
  assert((await response.text()) === "ok", "fetch to an allowlisted host works");
  assert(
    (await rejects(fetch(`http://127.0.0.1:${port}/`)))?.includes("not allowed"),
    "a host that isn't on the list is blocked"
  );
  assert(isUrlAllowed("https://api.example.com/x") && isUrlAllowed("https://example.com/"), "*.example.com matches the domain and subdomains");
  assert(!isUrlAllowed("https://example.com.evil.net/"), "but not look-alike hosts");
  assert(!isUrlAllowed("file:///etc/passwd"), "only http(s) URLs are allowed");

  server.close();
  console.log("\n✓ Network policy test passed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
