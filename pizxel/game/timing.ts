/**
 * Timing helpers
 *
 * Time-based (not frame-based) stepping, so games run at the same speed at
 * any frame rate: 60fps locally, 20fps on pizxel.uk.
 */

/**
 * Fires every `interval` seconds, carrying over leftover time so the
 * average rate is exact whatever the frame rate.
 *
 *   const step = new Ticker(0.15);
 *   onUpdate(dt) { for (let n = step.update(dt); n > 0; n--) moveSnake(); }
 */
export class Ticker {
  private elapsed: number = 0;

  constructor(public interval: number, private maxSteps: number = 5) {}

  /** Advance by dt seconds; returns how many steps are due */
  update(deltaTime: number): number {
    this.elapsed += deltaTime;
    let steps = 0;
    while (this.elapsed >= this.interval) {
      this.elapsed -= this.interval;
      if (++steps >= this.maxSteps) {
        this.elapsed = 0; // Far behind: drop the backlog rather than burst
        break;
      }
    }
    return steps;
  }

  reset(): void {
    this.elapsed = 0;
  }
}

/**
 * Auto-repeat for a held key ("delayed auto shift"): after the first press
 * (handled by the keydown itself), repeats start after `delay` seconds and
 * then fire every `rate` seconds while the key is held.
 *
 *   const left = new KeyRepeat();
 *   onUpdate(dt) {
 *     for (let n = left.update(isKeyDown("ArrowLeft"), dt); n > 0; n--) move(-1);
 *   }
 */
export class KeyRepeat {
  private heldFor: number = 0;
  private repeats: number = 0;

  constructor(public delay: number = 0.17, public rate: number = 0.05) {}

  /** Returns how many repeat steps are due this frame */
  update(held: boolean, deltaTime: number): number {
    if (!held) {
      this.heldFor = 0;
      this.repeats = 0;
      return 0;
    }
    this.heldFor += deltaTime;
    if (this.heldFor < this.delay) return 0;
    const due = Math.floor((this.heldFor - this.delay) / this.rate) + 1;
    const steps = Math.min(due - this.repeats, 5);
    this.repeats = due;
    return Math.max(0, steps);
  }

  reset(): void {
    this.heldFor = 0;
    this.repeats = 0;
  }
}
