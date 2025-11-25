/**
 * Example Test - Testing the Test App
 *
 * Demonstrates the PiZXel testing framework.
 */

import { TestRunner } from "../pizxel/testing";
import { TestApp } from "../pizxel/apps/test-app";
import { InputKeys } from "../pizxel/types";

async function testMovement() {
  console.log("Testing TestApp movement...");

  const runner = new TestRunner(10.0); // 10 second timeout

  // Start the app
  await runner.start(TestApp);

  // Wait for initial render
  await runner.wait(0.5);

  // Verify app is rendering
  runner.assertRenderCount(
    runner.display.renderCount,
    1,
    undefined,
    "Should have rendered"
  );

  // Find the green rectangle
  const initialPos = runner.findSprite([0, 255, 0], 10);
  if (!initialPos) throw new Error("Green rectangle should be visible");

  console.log(`  Initial position: (${initialPos.x}, ${initialPos.y})`);

  // Move right
  runner.inject(InputKeys.RIGHT);
  await runner.wait(0.2);

  const afterRight = runner.findSprite([0, 255, 0], 10);
  if (!afterRight) throw new Error("Rectangle should still be visible");
  runner.assertTrue(afterRight.x > initialPos.x, "Rectangle should move right");

  console.log(`  After right: (${afterRight.x}, ${afterRight.y})`);

  // Move down
  runner.inject(InputKeys.DOWN);
  await runner.wait(0.2);

  const afterDown = runner.findSprite([0, 255, 0], 10);
  if (!afterDown) throw new Error("Rectangle should still be visible");
  runner.assertTrue(afterDown.y > afterRight.y, "Rectangle should move down");

  console.log(`  After down: (${afterDown.x}, ${afterDown.y})`);

  // Change color with space
  runner.inject(" ");
  await runner.wait(0.2);

  // Rectangle should no longer be green
  const greenAfterColor = runner.findSprite([0, 255, 0], 10);
  runner.assertTrue(
    greenAfterColor === null,
    "Rectangle should no longer be green"
  );

  // Should now be blue
  const blueRect = runner.findSprite([0, 0, 255], 10);
  if (!blueRect) throw new Error("Rectangle should be blue");

  console.log(`  Color changed to blue at (${blueRect.x}, ${blueRect.y})`);

  runner.stop();
  console.log("✓ TestApp movement test passed!");
}

async function testHelpModal() {
  console.log("\nTesting help modal...");

  const runner = new TestRunner(10.0);
  await runner.start(TestApp);
  await runner.wait(0.5);

  // Open help modal with Tab
  runner.inject("Tab");
  await runner.wait(0.3);

  // Modal should show yellow text (key shortcuts)
  const yellowCount = runner.countColor([255, 255, 0], 10);
  runner.assertTrue(
    yellowCount > 100,
    `Should have yellow text in modal (found ${yellowCount} pixels)`
  );

  console.log(`  Yellow pixels (shortcuts): ${yellowCount}`);

  // Close modal with Enter
  runner.inject(InputKeys.OK);
  await runner.wait(0.3);

  // Yellow count should decrease (modal closed)
  const yellowAfter = runner.countColor([255, 255, 0], 10);
  runner.assertTrue(
    yellowAfter < yellowCount,
    "Modal should close, reducing yellow pixels"
  );

  console.log(`  Yellow after close: ${yellowAfter}`);

  runner.stop();
  console.log("✓ Help modal test passed!");
}

async function runAllTests() {
  try {
    await testMovement();
    await testHelpModal();
    console.log("\n✓ All tests passed!");
  } catch (error) {
    console.error("\n✗ Test failed:", error);
    process.exit(1);
  }
}

runAllTests();
