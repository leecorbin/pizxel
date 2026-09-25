/**
 * Settings App - System Configuration
 */

import { App, InputEvent, InputKeys } from "../../types";
import { DisplayBuffer } from "../../core/display-buffer";
import { getAudio } from "../../start";
import { Sounds } from "../../audio/audio";
import { AppStorage } from "../../storage";
import { getAppFramework } from "../../start";

export class SettingsApp implements App {
  readonly name = "Settings";
  private dirty = true;
  private storage: AppStorage;
  private selectedIndex = 0;

  private menuItems = [
    { name: "Volume", icon: "🔊", value: 80, type: "slider" as const },
    { name: "Brightness", icon: "💡", value: 100, type: "slider" as const },
    {
      name: "Standby Timeout",
      icon: "⏱️",
      value: 120,
      type: "slider" as const,
    }, // seconds
    { name: "Standby Enabled", icon: "💤", value: 1, type: "toggle" as const },
    { name: "Test Standby Now", icon: "▶️", value: 0, type: "button" as const },
    { name: "About", icon: "ℹ️", value: 0, type: "button" as const },
  ];

  constructor() {
    this.storage = new AppStorage("settings");

    // Load saved values
    const volumeStr = this.storage.get("volume");
    if (volumeStr) {
      this.menuItems[0].value = parseInt(volumeStr);
    }
    const brightnessStr = this.storage.get("brightness");
    if (brightnessStr) {
      this.menuItems[1].value = parseInt(brightnessStr);
    }

    // Load standby settings
    const framework = getAppFramework();
    if (framework) {
      const standbyMgr = framework.getStandbyManager();
      const config = standbyMgr.getConfig();
      this.menuItems[2].value = config.idleTimeoutSeconds; // timeout
      this.menuItems[3].value = config.enabled ? 1 : 0; // enabled
      this.menuItems[4].value = Math.round(config.brightnessMultiplier * 100); // brightness %
    }
  }

  async onActivate(): Promise<void> {
    this.dirty = true;
  }

  onDeactivate(): void {}

  onUpdate(deltaTime: number): void {}

  onEvent(event: InputEvent): boolean {
    if (event.type !== "keydown") return false;

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
        // Decrease value
        const leftItem = this.menuItems[this.selectedIndex];
        if (leftItem.type === "slider") {
          if (this.selectedIndex === 2) {
            // Standby timeout: 30s to 600s (10 minutes) in 30s increments
            leftItem.value = Math.max(30, leftItem.value - 30);
          } else {
            // Volume, brightness, standby brightness: 0-100%
            leftItem.value = Math.max(0, leftItem.value - 10);
          }
          this.saveAndApply(this.selectedIndex);
          getAudio()?.play(Sounds.SELECT);
          handled = true;
        } else if (leftItem.type === "toggle") {
          // Toggle off
          leftItem.value = 0;
          this.saveAndApply(this.selectedIndex);
          getAudio()?.play(Sounds.SELECT);
          handled = true;
        }
        break;

      case InputKeys.RIGHT:
      case "d":
      case "D":
        // Increase value
        const rightItem = this.menuItems[this.selectedIndex];
        if (rightItem.type === "slider") {
          if (this.selectedIndex === 2) {
            // Standby timeout: 30s to 600s (10 minutes) in 30s increments
            rightItem.value = Math.min(600, rightItem.value + 30);
          } else {
            // Volume, brightness, standby brightness: 0-100%
            rightItem.value = Math.min(100, rightItem.value + 10);
          }
          this.saveAndApply(this.selectedIndex);
          getAudio()?.play(Sounds.SELECT);
          handled = true;
        } else if (rightItem.type === "toggle") {
          // Toggle on
          rightItem.value = 1;
          this.saveAndApply(this.selectedIndex);
          getAudio()?.play(Sounds.SELECT);
          handled = true;
        }
        break;

      case InputKeys.OK:
      case "Enter":
        // Handle button press
        if (this.menuItems[this.selectedIndex].type === "button") {
          if (this.selectedIndex === 5) {
            // Test Standby Now
            const framework = getAppFramework();
            if (framework) {
              framework.getStandbyManager().activate();
            }
            getAudio()?.play(Sounds.SELECT);
            handled = true;
          }
        }
        break;
    }

    if (handled) {
      this.dirty = true;
    }

    return handled;
  }

  private saveAndApply(index: number): void {
    const item = this.menuItems[index];

    if (index === 0) {
      // Volume
      this.storage.set("volume", item.value.toString());
      const audio = getAudio();
      if (audio) {
        audio.setVolume(item.value / 100);
      }
    } else if (index === 1) {
      // Brightness
      this.storage.set("brightness", item.value.toString());
    } else if (index >= 2 && index <= 4) {
      // Standby settings
      const framework = getAppFramework();
      if (framework) {
        const standbyMgr = framework.getStandbyManager();
        const config = standbyMgr.getConfig();

        if (index === 2) {
          // Idle timeout
          config.idleTimeoutSeconds = item.value;
        } else if (index === 3) {
          // Enabled toggle
          config.enabled = item.value === 1;
        }

        standbyMgr.saveConfig(config);
      }
    }
  }

  render(matrix: DisplayBuffer): void {
    if (!this.dirty) return;

    matrix.clear();

    // Title
    matrix.text("⚙️ SETTINGS", 10, 10, [255, 255, 255]);

    // Menu items
    let y = 40;
    for (let i = 0; i < this.menuItems.length; i++) {
      const item = this.menuItems[i];
      const isSelected = i === this.selectedIndex;
      const color: [number, number, number] = isSelected
        ? [255, 255, 0]
        : [200, 200, 200];

      // Item name
      matrix.text(`${item.icon} ${item.name}`, 20, y, color);

      // Value display based on type
      if (item.type === "slider") {
        // Draw bar for sliders
        const barWidth = 60;
        const barHeight = 8;
        const barX = 170;
        const barY = y;

        // Border
        matrix.rect(barX, barY, barWidth, barHeight, color, false);

        // Fill
        let fillPercent = item.value / 100;
        if (i === 2) {
          // Timeout: 30-600s range
          fillPercent = (item.value - 30) / (600 - 30);
        }
        const fillWidth = Math.floor(fillPercent * (barWidth - 2));
        if (fillWidth > 0) {
          matrix.rect(
            barX + 1,
            barY + 1,
            fillWidth,
            barHeight - 2,
            color,
            true
          );
        }

        // Value text
        let valueText = `${item.value}%`;
        if (i === 2) {
          // Show timeout in seconds or minutes
          valueText =
            item.value >= 60
              ? `${Math.round(item.value / 60)}m`
              : `${item.value}s`;
        }
        matrix.text(valueText, barX + barWidth + 5, y, color);
      } else if (item.type === "toggle") {
        // Draw ON/OFF for toggles
        const toggleText = item.value === 1 ? "ON" : "OFF";
        const toggleColor: [number, number, number] =
          item.value === 1 ? [0, 255, 0] : [255, 0, 0];
        matrix.text(toggleText, 200, y, isSelected ? color : toggleColor);
      } else if (item.type === "button") {
        // Show arrow for buttons
        if (isSelected) {
          matrix.text("▶", 200, y, color);
        }
      }

      y += 25;
    }

    // Instructions
    matrix.text(
      "←→ Adjust   ↑↓ Select   Enter Activate",
      5,
      175,
      [150, 150, 150]
    );
    matrix.text("ESC Exit", 85, 185, [150, 150, 150]);

    this.dirty = false;
  }
}
