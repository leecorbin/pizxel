/**
 * Canvas Display Integration Example
 *
 * Shows how to use CanvasDisplay alongside existing displays.
 * Run this and open http://localhost:3000 in your browser.
 */

import { CanvasDisplay } from "../display";
import { DisplayBuffer } from "../core/display-buffer";

async function demo() {
  console.log("Starting Canvas Display Demo...");

  // Create and start canvas display
  const canvas = new CanvasDisplay({ port: 3001, pixelSize: 3 });
  await canvas.start(128, 128);

  console.log("Canvas display running at http://localhost:3001");
  console.log("Press Ctrl+C to stop");

  // Create display buffer
  const display = new DisplayBuffer(128, 128);

  // Animation loop
  let frame = 0;
  const animate = () => {
    display.clear();

    // Draw animated rectangle
    const x = Math.floor(30 + Math.sin(frame * 0.05) * 20);
    const y = Math.floor(30 + Math.cos(frame * 0.05) * 20);
    const color: [number, number, number] = [
      Math.floor(128 + Math.sin(frame * 0.1) * 127),
      Math.floor(128 + Math.cos(frame * 0.15) * 127),
      Math.floor(128 + Math.sin(frame * 0.2) * 127),
    ];

    display.rect(x, y, 40, 40, color, true); // Draw text
    display.text("PiZXel", 40, 80, [255, 255, 0]);
    display.text("Canvas Display", 20, 95, [0, 255, 255]);

    // Update canvas
    canvas.update(display);

    frame++;
    setTimeout(animate, 1000 / 60); // 60 FPS
  };

  animate();

  // Cleanup on exit
  process.on("SIGINT", async () => {
    console.log("\nStopping...");
    await canvas.stop();
    process.exit(0);
  });
}

demo();
