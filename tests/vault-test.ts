/**
 * Vault Test
 *
 * Secrets are encrypted, bound to their app and name, usable only with the
 * right key, and never on disk in plain text. Also: the local key file, and
 * moving old plaintext API keys into the vault.
 *
 * Run: npx tsx tests/vault-test.ts
 */

import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Vault, appSecrets, localVaultKey } from "../pizxel/core/vault";
import { ApiKey } from "../pizxel/core/api-key";

function assert(condition: any, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
  console.log(`  ✓ ${message}`);
}

function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pizxel-vault-test-"));
  const key = crypto.randomBytes(32);
  const secret = "sk-test-0123456789abcdef";

  console.log("Setup and use");
  const vault = new Vault(path.join(dir, "vault"));
  const requests: string[] = [];
  vault.onRequest = (kind, app, name) => requests.push(`${kind}:${app}:${name}`);
  assert(vault.state() === "none", "a new vault doesn't exist yet");
  assert(!vault.set("news", "apiKey", secret), "saving before setup fails");
  assert(requests.includes("setup:news:apiKey"), "and asks the viewer to set up the vault");
  assert(vault.unlock(key), "the first key creates the vault");
  assert(vault.get("news", "apiKey") === secret, "and completes the save that was waiting for it");
  assert(vault.state() === "unlocked", "which is then unlocked");
  assert(vault.set("news", "apiKey", secret), "a secret can be saved");
  assert(vault.get("news", "apiKey") === secret, "and read back");

  console.log("At rest");
  const onDisk = fs.readFileSync(path.join(dir, "vault", "vault.json"), "utf-8");
  assert(!onDisk.includes(secret) && !onDisk.includes(key.toString("base64")), "neither the secret nor the key is on disk");
  assert((fs.statSync(path.join(dir, "vault", "vault.json")).mode & 0o077) === 0, "the vault file is readable by its owner only");

  console.log("Locking and keys");
  vault.lock();
  requests.length = 0;
  assert(vault.state() === "locked" && vault.get("news", "apiKey") === null, "locked, secrets can't be read");
  assert(requests.includes("need:news:apiKey"), "and the viewer is asked to unlock");
  assert(!vault.set("news", "later", "saved-while-locked"), "a save while locked waits");
  assert(!vault.unlock(crypto.randomBytes(32)), "a wrong key is refused");
  assert(vault.state() === "locked", "and not kept");
  const reopened = new Vault(path.join(dir, "vault"));
  assert(reopened.unlock(key) && reopened.get("news", "apiKey") === secret, "the right key opens it again, e.g. after a restart");
  assert(vault.unlock(key) && vault.get("news", "later") === "saved-while-locked", "and completes when the vault unlocks");
  vault.delete("news", "later");

  console.log("Scoping");
  const file = JSON.parse(fs.readFileSync(path.join(dir, "vault", "vault.json"), "utf-8"));
  file.records.weather = { apiKey: file.records.news.apiKey };
  fs.writeFileSync(path.join(dir, "vault", "vault.json"), JSON.stringify(file));
  assert(reopened.get("weather", "apiKey") === null, "a record copied to another app can't be decrypted");
  const news = appSecrets(reopened, "news");
  const weather = appSecrets(reopened, "weather");
  assert(news.get("apiKey") === secret && weather.get("apiKey") === null, "each app sees only its own secrets");
  assert(
    JSON.stringify(reopened.list()) === JSON.stringify([
      { app: "news", names: ["apiKey"] },
      { app: "weather", names: ["apiKey"] },
    ]),
    "list() gives names only"
  );
  reopened.delete("weather", "apiKey");
  news.delete("apiKey");
  assert(reopened.list().length === 0, "secrets can be deleted");
  reopened.wipe();
  assert(reopened.state() === "none" && !fs.existsSync(path.join(dir, "vault", "vault.json")), "wipe() removes the vault");

  console.log("Moving old plaintext keys in");
  const migrationVault = new Vault(path.join(dir, "migration"));
  migrationVault.unlock(key);
  const plain = new Map<string, any>([["apiKey", secret]]);
  const storage = {
    get: (k: string, d?: any) => (plain.has(k) ? plain.get(k) : d),
    set: (k: string, v: any) => void plain.set(k, v),
    delete: (k: string) => void plain.delete(k),
  };
  const app: any = { secrets: appSecrets(migrationVault, "news-reader") };
  const apiKey = new ApiKey(app, storage, "PIZXEL_TEST_NO_SUCH_VAR");
  apiKey.migrate();
  assert(migrationVault.get("news-reader", "apiKey") === secret, "a plaintext key moves into the vault");
  assert(!plain.has("apiKey"), "and the plain copy is deleted");
  assert(apiKey.get() === secret, "the app still reads its key");
  process.env.PIZXEL_TEST_OPERATOR_KEY = "operator";
  const fallback = new ApiKey({ secrets: appSecrets(migrationVault, "other") } as any, storage, "PIZXEL_TEST_OPERATOR_KEY");
  assert(fallback.get() === "operator", "with no key of its own, an app falls back to the operator key");

  console.log("Local key file");
  const keyFile = path.join(dir, "config", "vault.key");
  process.env.PIZXEL_VAULT_KEY_FILE = keyFile;
  const localKey = localVaultKey();
  assert(localKey.length === 32 && (fs.statSync(keyFile).mode & 0o077) === 0, "a key file is created, readable by its owner only");
  assert(localVaultKey().equals(localKey), "and the same key is read back");
  fs.writeFileSync(keyFile, "damaged");
  let threw = false;
  try {
    localVaultKey();
  } catch {
    threw = true;
  }
  assert(threw && fs.readFileSync(keyFile, "utf-8") === "damaged", "a damaged key file is an error, never overwritten");

  fs.rmSync(dir, { recursive: true, force: true });
  console.log("\n✓ Vault test passed");
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
