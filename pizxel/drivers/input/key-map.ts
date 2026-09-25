/**
 * Key Map
 *
 * Maps terminal key sequences and browser KeyboardEvent.key names onto
 * PiZXel's event keys (see InputKeys). Shared by the terminal keyboard
 * driver and browser-fed input drivers.
 */

/**
 * Map a raw key to a PiZXel event key, or null if it isn't one we handle
 * (e.g. "Shift", "F1", unknown escape sequences)
 */
export function mapKey(key: string): string | null {
  switch (key) {
    // Terminal escape sequences / browser key names
    case "\u001b[A":
    case "ArrowUp":
      return "ArrowUp";
    case "\u001b[B":
    case "ArrowDown":
      return "ArrowDown";
    case "\u001b[C":
    case "ArrowRight":
      return "ArrowRight";
    case "\u001b[D":
    case "ArrowLeft":
      return "ArrowLeft";
    case "\r":
    case "\n":
    case "Enter":
      return "Enter";
    case " ":
    case "Space":
      return " ";
    case "\u007f":
    case "\b":
    case "Backspace":
      return "Backspace";
    case "\u001b":
    case "Escape":
      return "Escape";
    case "\t":
    case "Tab":
      return "Tab";
    default:
      // Single character key
      return key.length === 1 ? key : null;
  }
}
