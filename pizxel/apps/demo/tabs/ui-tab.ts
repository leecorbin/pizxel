/**
 * UI Components Tab
 *
 * Scrollable showcase of all UI components
 */

import { Container } from "../../../ui/core/container";
import {
  Label,
  Button,
  Panel,
  ProgressBar,
  Slider,
} from "../../../ui";
import { InputEvent, InputKeys } from "../../../types/index";

export function createUITab(): UITabContainer {
  return new UITabContainer({
    x: 0,
    y: 0,
    width: 256,
    height: 152,
  });
}

class UITabContainer extends Container {
  private scrollOffset = 0;
  private maxScroll = 300; // Total content height
  private viewHeight = 152;

  constructor(options: any) {
    super(options);
    this.buildContent();
  }

  private buildContent(): void {
    let y = 10;

    // Section: Labels
    const labelTitle = new Label({
      text: "LABELS",
      x: 10,
      y,
      color: [100, 180, 255],
    });
    this.addChild(labelTitle);
    y += 20;

    const label1 = new Label({
      text: "Standard label",
      x: 20,
      y,
      color: [255, 255, 255],
    });
    this.addChild(label1);
    y += 15;

    const label2 = new Label({
      text: "Colored label",
      x: 20,
      y,
      color: [255, 150, 50],
    });
    this.addChild(label2);
    y += 25;

    // Section: Buttons
    const buttonTitle = new Label({
      text: "BUTTONS",
      x: 10,
      y,
      color: [100, 180, 255],
    });
    this.addChild(buttonTitle);
    y += 20;

    const button1 = new Button({
      text: "Primary Button",
      x: 20,
      y,
      width: 100,
      height: 20,
      bgColor: [60, 120, 200],
      color: [255, 255, 255],
      onPress: () => console.log("Button clicked!"),
    });
    this.addChild(button1);
    y += 30;

    const button2 = new Button({
      text: "Secondary",
      x: 130,
      y: y - 30,
      width: 100,
      height: 20,
      bgColor: [80, 80, 80],
      color: [200, 200, 200],
      onPress: () => console.log("Secondary clicked!"),
    });
    this.addChild(button2);
    y += 10;

    // Section: Progress Bars
    const progressTitle = new Label({
      text: "PROGRESS BARS",
      x: 10,
      y,
      color: [100, 180, 255],
    });
    this.addChild(progressTitle);
    y += 20;

    const progress1 = new ProgressBar({
      x: 20,
      y,
      width: 200,
      height: 10,
      value: 70,
      barColor: [50, 200, 50],
      bgColor: [40, 40, 40],
    });
    this.addChild(progress1);
    y += 20;

    const progress2 = new ProgressBar({
      x: 20,
      y,
      width: 200,
      height: 10,
      value: 30,
      barColor: [255, 150, 50],
      bgColor: [40, 40, 40],
    });
    this.addChild(progress2);
    y += 25;

    // Section: Sliders
    const sliderTitle = new Label({
      text: "SLIDERS",
      x: 10,
      y,
      color: [100, 180, 255],
    });
    this.addChild(sliderTitle);
    y += 20;

    const slider1 = new Slider({
      x: 20,
      y,
      width: 200,
      min: 0,
      max: 100,
      value: 65,
      onChange: (value) => console.log(`Slider: ${value}`),
    });
    this.addChild(slider1);
    y += 30;

    // Section: Panels
    const panelTitle = new Label({
      text: "PANELS",
      x: 10,
      y,
      color: [100, 180, 255],
    });
    this.addChild(panelTitle);
    y += 20;

    const panel1 = new Panel({
      x: 20,
      y,
      width: 100,
      height: 60,
      bgColor: [60, 60, 80],
      borderColor: [100, 100, 150],
      borderWidth: 1,
    });
    this.addChild(panel1);

    const panelLabel = new Label({
      text: "Panel Content",
      x: 30,
      y: y + 20,
      color: [200, 200, 200],
    });
    this.addChild(panelLabel);

    y += 70;

    this.maxScroll = Math.max(0, y - this.viewHeight + 20);
  }

  handleEvent(event: InputEvent): boolean {
    // Scroll with up/down
    if (event.key === InputKeys.UP && this.scrollOffset > 0) {
      this.scrollOffset = Math.max(0, this.scrollOffset - 20);
      this.updateChildPositions();
      return true;
    }

    if (event.key === InputKeys.DOWN && this.scrollOffset < this.maxScroll) {
      this.scrollOffset = Math.min(this.maxScroll, this.scrollOffset + 20);
      this.updateChildPositions();
      return true;
    }

    return false;
  }

  private updateChildPositions(): void {
    // Offset all children by scroll amount
    this.children.forEach((child) => {
      if ("y" in child) {
        // Store original Y if not already stored
        if (!("_originalY" in child)) {
          (child as any)._originalY = (child as any).y;
        }
        (child as any).y = (child as any)._originalY - this.scrollOffset;
      }
    });
  }
}
