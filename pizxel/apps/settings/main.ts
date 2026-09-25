/**
 * Settings App - System Configuration
 */

import { App, InputEvent, InputKeys } from "../../types";
import { DisplayBuffer } from "../../core/display-buffer";
import { getAudio } from "../../start";
import { Sounds } from "../../audio/audio";
import { AppStorage } from "../../storage";
import { getAppFramework } from "../../start";
import { getInstanceContext } from "../../core/instance-context";
import { AppScanner } from "../../core/app-scanner";

type ItemId =
  | "volume"
  | "brightness"
  | "standbyTimeout"
  | "standbyEnabled"
  | "testStandby"
  | "keys"
  | "about";

interface MenuItem {
  id: ItemId;
  name: string;
  type: "slider" | "toggle" | "button";
  value: number;
  min?: number;
  max?: number;
  step?: number;
}

type RGB = [number, number, number];

export class SettingsApp implements App {
  readonly name = "Settings";
  private dirty = true;
  private storage: AppStorage;
  private selectedIndex = 0;
  private showingAbout = false;

  // Keys screen: apps' saved secrets (names only), with delete
  private showingKeys = false;
  private keyEntries: Array<{ app: string; appName: string; name: string }> = [];
  private keyIndex = 0;
  private confirmingDelete = false;

  private menuItems: MenuItem[] = [
    { id: "volume", name: "Volume", type: "slider", value: 80, min: 0, max: 100, step: 10 },
    { id: "brightness", name: "Brightness", type: "slider", value: 100, min: 0, max: 100, step: 10 },
    // Seconds: 30s to 10 minutes
    { id: "standbyTimeout", name: "Standby after", type: "slider", value: 120, min: 30, max: 600, step: 30 },
    { id: "standbyEnabled", name: "Standby", type: "toggle", value: 1 },
    { id: "testStandby", name: "Test standby now", type: "button", value: 0 },
    { id: "keys", name: "Keys", type: "button", value: 0 },
    { id: "about", name: "About", type: "button", value: 0 },
  ];

  constructor() {
    this.storage = new AppStorage("settings");

    // Load saved values
    const volumeStr = this.storage.get("volume");
    if (volumeStr) {
      this.item("volume").value = parseInt(volumeStr);
    }
    const brightnessStr = this.storage.get("brightness");
    if (brightnessStr) {
      this.item("brightness").value = parseInt(brightnessStr);
    }

    // Load standby settings
    const framework = getAppFramework();
    if (framework) {
      const config = framework.getStandbyManager().getConfig();
      this.item("standbyTimeout").value = config.idleTimeoutSeconds;
      this.item("standbyEnabled").value = config.enabled ? 1 : 0;
    }
  }

  private item(id: ItemId): MenuItem {
    return this.menuItems.find((item) => item.id === id)!;
  }

  async onActivate(): Promise<void> {
    this.showingAbout = false;
    this.showingKeys = false;
    this.dirty = true;
  }

  onDeactivate(): void {}

  onUpdate(deltaTime: number): void {}

  onEvent(event: InputEvent): boolean {
    if (event.type !== "keydown") return false;

    if (this.showingKeys) {
      this.handleKeysEvent(event);
      this.dirty = true;
      return true;
    }

    // The About panel closes on any key (Escape too, rather than leaving)
    if (this.showingAbout) {
      this.showingAbout = false;
      this.dirty = true;
      return true;
    }

    const item = this.menuItems[this.selectedIndex];
    let handled = false;

    switch (event.key) {
      case InputKeys.UP:
      case "w":
      case "W":
        if (this.selectedIndex > 0) {
          this.selectedIndex--;
          getAudio()?.play(Sounds.SELECT);
          handled = true;
        }
        break;

      case InputKeys.DOWN:
      case "s":
      case "S":
        if (this.selectedIndex < this.menuItems.length - 1) {
          this.selectedIndex++;
          getAudio()?.play(Sounds.SELECT);
          handled = true;
        }
        break;

      case InputKeys.LEFT:
      case "a":
      case "A":
        handled = this.adjust(item, -1);
        break;

      case InputKeys.RIGHT:
      case "d":
      case "D":
        handled = this.adjust(item, 1);
        break;

      case InputKeys.OK:
        handled = this.activate(item);
        break;
    }

    if (handled) {
      this.dirty = true;
    }

    return handled;
  }

  /** Move a slider or set a toggle (direction -1 = left, 1 = right) */
  private adjust(item: MenuItem, direction: -1 | 1): boolean {
    if (item.type === "slider") {
      item.value = Math.min(
        item.max!,
        Math.max(item.min!, item.value + direction * item.step!)
      );
    } else if (item.type === "toggle") {
      item.value = direction > 0 ? 1 : 0;
    } else {
      return false;
    }
    this.saveAndApply(item);
    getAudio()?.play(Sounds.SELECT);
    return true;
  }

  private activate(item: MenuItem): boolean {
    switch (item.id) {
      case "testStandby":
        getAudio()?.play(Sounds.SELECT);
        getAppFramework()?.getStandbyManager().activate();
        return true;
      case "about":
        getAudio()?.play(Sounds.SELECT);
        this.showingAbout = true;
        return true;
      case "keys":
        getAudio()?.play(Sounds.SELECT);
        this.openKeys();
        return true;
      case "standbyEnabled":
        // Enter flips a toggle too
        return this.adjust(item, item.value === 1 ? -1 : 1);
      default:
        return false;
    }
  }

  private saveAndApply(item: MenuItem): void {
    const framework = getAppFramework();

    switch (item.id) {
      case "volume":
        this.storage.set("volume", item.value.toString());
        getAudio()?.setVolume(item.value / 100);
        break;

      case "brightness":
        this.storage.set("brightness", item.value.toString());
        framework?.setDisplayBrightness(item.value);
        break;

      case "standbyTimeout":
      case "standbyEnabled": {
        if (!framework) break;
        const standbyManager = framework.getStandbyManager();
        const config = standbyManager.getConfig();
        if (item.id === "standbyTimeout") {
          config.idleTimeoutSeconds = item.value;
        } else {
          config.enabled = item.value === 1;
        }
        standbyManager.saveConfig(config);
        break;
      }
    }
  }

  private static formatValue(item: MenuItem): string {
    if (item.id !== "standbyTimeout") return `${item.value}%`;
    const minutes = Math.floor(item.value / 60);
    const seconds = item.value % 60;
    if (minutes === 0) return `${seconds}s`;
    return seconds === 0 ? `${minutes}m` : `${minutes}m${seconds}s`;
  }

  render(matrix: DisplayBuffer): void {
    if (!this.dirty) return;

    matrix.clear();

    if (this.showingAbout) {
      this.renderAbout(matrix);
      this.dirty = false;
      return;
    }
    if (this.showingKeys) {
      this.renderKeys(matrix);
      this.dirty = false;
      return;
    }

    // Title
    matrix.text("SETTINGS", 8, 8, [255, 255, 255]);

    // Menu items
    const barX = 136;
    const barWidth = 60;
    let y = 30;
    for (let i = 0; i < this.menuItems.length; i++) {
      const item = this.menuItems[i];
      const isSelected = i === this.selectedIndex;
      const color: RGB = isSelected ? [255, 255, 0] : [200, 200, 200];

      matrix.text(isSelected ? "→" : " ", 8, y, color);
      matrix.text(item.name, 20, y, color);

      if (item.type === "slider") {
        // Bar
        matrix.rect(barX, y, barWidth, 8, color, false);
        const fill = (item.value - item.min!) / (item.max! - item.min!);
        const fillWidth = Math.floor(fill * (barWidth - 2));
        if (fillWidth > 0) {
          matrix.rect(barX + 1, y + 1, fillWidth, 6, color, true);
        }
        matrix.text(SettingsApp.formatValue(item), barX + barWidth + 4, y, color);
      } else if (item.type === "toggle") {
        const on = item.value === 1;
        const toggleColor: RGB = on ? [0, 255, 0] : [255, 0, 0];
        matrix.text(on ? "ON" : "OFF", barX, y, isSelected ? color : toggleColor);
      }

      y += 18;
    }

    // Instructions (each line fits the 256px screen)
    matrix.centeredText("←→ Adjust   ↑↓ Select", 162, [150, 150, 150]);
    matrix.centeredText("Enter Activate  ESC Exit", 176, [150, 150, 150]);

    this.dirty = false;
  }

  // ===== Keys =====

  private openKeys(): void {
    const vault = getInstanceContext().vault;
    const names = new Map(
      new AppScanner().listApps().map((app) => [app.id, app.config.name])
    );
    this.keyEntries = [];
    for (const { app, names: secretNames } of vault?.list() ?? []) {
      for (const name of secretNames) {
        this.keyEntries.push({ app, appName: names.get(app) ?? app, name });
      }
    }
    this.keyIndex = 0;
    this.confirmingDelete = false;
    this.showingKeys = true;
  }

  private handleKeysEvent(event: InputEvent): void {
    if (this.confirmingDelete) {
      const entry = this.keyEntries[this.keyIndex];
      if (event.key === InputKeys.OK && entry) {
        getInstanceContext().vault?.delete(entry.app, entry.name);
        getAudio()?.play(Sounds.SELECT);
        this.openKeys();
        return;
      }
      this.confirmingDelete = false; // Anything else cancels
      return;
    }

    switch (event.key) {
      case InputKeys.UP:
        this.keyIndex = Math.max(0, this.keyIndex - 1);
        break;
      case InputKeys.DOWN:
        this.keyIndex = Math.min(this.keyEntries.length - 1, this.keyIndex + 1);
        break;
      case InputKeys.OK:
      case InputKeys.BACK:
        if (this.keyEntries.length > 0) this.confirmingDelete = true;
        break;
      case InputKeys.HOME:
        this.showingKeys = false; // Escape: back to Settings, not out
        break;
    }
  }

  private renderKeys(matrix: DisplayBuffer): void {
    matrix.text("KEYS", 8, 8, [255, 255, 255]);

    const state = getInstanceContext().vault?.state() ?? "none";
    const status =
      state === "unlocked" ? "Unlocked" : state === "locked" ? "Locked" : "No keys saved yet";
    matrix.text(status, 256 - matrix.measureText(status) - 8, 8, [150, 150, 150]);

    if (this.keyEntries.length === 0) {
      matrix.centeredText("No saved keys", 80, [200, 200, 200]);
      matrix.centeredText("Apps save keys here", 96, [150, 150, 150]);
      matrix.centeredText("when you enter them", 108, [150, 150, 150]);
    }

    // Names only, never values; up to 10 rows
    const first = Math.max(0, Math.min(this.keyIndex - 4, this.keyEntries.length - 10));
    let y = 30;
    for (let i = first; i < Math.min(this.keyEntries.length, first + 10); i++) {
      const entry = this.keyEntries[i];
      const selected = i === this.keyIndex;
      const color: RGB = selected ? [255, 255, 0] : [200, 200, 200];
      const label = `${entry.appName}: ${entry.name}`.slice(0, 28);
      matrix.text(selected ? "→" : " ", 8, y, color);
      matrix.text(label, 20, y, color);
      y += 12;
    }

    if (this.confirmingDelete) {
      matrix.centeredText("Delete this key?", 158, [255, 100, 100]);
      matrix.centeredText("Enter Yes   any key No", 172, [200, 200, 200]);
    } else {
      matrix.centeredText("↑↓ Select  Enter Delete", 162, [150, 150, 150]);
      matrix.centeredText("ESC Back", 176, [150, 150, 150]);
    }
  }

  private renderAbout(matrix: DisplayBuffer): void {
    matrix.centeredText("PiZXel", 40, [0, 255, 255]);
    matrix.centeredText("v0.1.0", 56, [200, 200, 200]);
    matrix.centeredText("Looks like 1983,", 84, [255, 255, 255]);
    matrix.centeredText("works like 2025", 98, [255, 255, 255]);
    matrix.centeredText("pizxel.uk", 126, [255, 255, 0]);
    matrix.centeredText("Any key to go back", 170, [150, 150, 150]);
  }
}
