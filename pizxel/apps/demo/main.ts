/**
 * PiZXel Demo App
 *
 * Comprehensive showcase of all PiZXel features:
 * - UI Components
 * - Loading Spinners
 * - Visual Effects
 */

import { App, InputEvent, InputKeys } from "../../types/index";
import { DisplayBuffer } from "../../core/display-buffer";
import { TabView, Tab } from "../../ui";
import { Container } from "../../ui/core/container";
import { HelpModal } from "../../ui/components/help-modal";

// Import tab content
import { createUITab } from "./tabs/ui-tab";
import { createSpinnersTab } from "./tabs/spinners-tab";
import { createVisualsTab } from "./tabs/visuals-tab";

export class DemoApp implements App {
  readonly name = "Demo";
  dirty = true;

  private tabView: TabView;
  private helpModal: HelpModal;
  private showHelp = false;

  constructor() {
    // Create help modal
    this.helpModal = new HelpModal({
      title: "PiZXel Demo Help",
      items: [
        { key: "←→", action: "Switch tabs" },
        { key: "1-3", action: "Jump to tab" },
        { key: "↑↓", action: "Scroll content (UI tab)" },
        { key: "Enter", action: "Launch visual demo" },
        { key: "ESC", action: "Return to launcher" },
        { key: "TAB", action: "Toggle help" },
      ],
    });

    // Create all tabs
    const tabs: Tab[] = [
      {
        id: "ui",
        label: "UI",
        content: createUITab(),
      },
      {
        id: "spinners",
        label: "Spinners",
        content: createSpinnersTab(),
      },
      {
        id: "visuals",
        label: "Visual FX",
        content: createVisualsTab(),
      },
    ];

    // Create tab view
    this.tabView = new TabView({
      x: 0,
      y: 16, // Below top bar
      width: 256,
      height: 176, // Full height minus top/bottom bars
      tabs,
      tabHeight: 24,
    });
  }

  onActivate(): void {
    this.dirty = true;
  }

  onDeactivate(): void {}

  onUpdate(deltaTime: number): void {
    this.tabView.update(deltaTime);
    // Redraw every frame only while the tab shown is animating (spinners, a
    // running visual demo); otherwise only after input. On pizxel.uk every
    // redraw is a frame sent to the viewer.
    const content = this.tabView.getActiveTab().content as any;
    if (content.isAnimating?.()) {
      this.dirty = true;
    }
  }

  onBackgroundTick(): void {}

  onEvent(event: InputEvent): boolean {
    // Tab key toggles help
    if (event.key === "Tab") {
      this.showHelp = !this.showHelp;
      this.dirty = true;
      return true;
    }

    // If help is showing, ESC closes it
    if (this.showHelp) {
      if (event.key === "Escape") {
        this.showHelp = false;
        this.dirty = true;
        return true;
      }
      return true; // Consume all events when help is showing
    }

    // Tab view handles its own navigation
    if (this.tabView.handleEvent(event)) {
      this.dirty = true;
      return true;
    }

    return false;
  }

  render(matrix: DisplayBuffer): void {
    matrix.clear();

    // Title bar
    matrix.text("PiZXel DEMO", 8, 4, [100, 180, 255]);

    // Instructions (right side of title bar)
    matrix.text("TAB:Help", 188, 4, [120, 120, 120]);

    // Render tab view
    this.tabView.render(matrix);

    // Render help modal on top if showing
    if (this.showHelp) {
      this.helpModal.render(matrix);
    }

    this.dirty = false;
  }
}

export function run(appFramework: any): void {
  const app = new DemoApp();
  appFramework.switchToApp(app);
}
