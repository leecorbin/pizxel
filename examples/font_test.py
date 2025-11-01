#!/usr/bin/env python3
"""
Font/Unicode Test - Check if your terminal supports block characters
"""

import sys

def main():
    print("Terminal Unicode Block Character Test")
    print("=" * 50)
    print()

    print("If your terminal supports Unicode block characters,")
    print("you should see solid blocks below, NOT dashes or underscores:")
    print()

    # Test individual characters
    print("Full block:       █ █ █ (should be solid squares)")
    print("Upper half block: ▀ ▀ ▀ (should be top half filled)")
    print("Lower half block: ▄ ▄ ▄ (should be bottom half filled)")
    print()

    # Test a pattern
    print("Pattern test:")
    print("█▀▀▀█")
    print("█   █")
    print("█▄▄▄█")
    print()

    # Test with colors
    print("\033[38;5;196mColored full block: █\033[0m (should be red)")
    print("\033[38;5;46mColored upper half: ▀\033[0m (should be green)")
    print("\033[38;5;21mColored lower half: ▄\033[0m (should be blue)")
    print()

    print("Character codes being used:")
    print(f"  Full block  = U+2588 (█) = {ord('█'):#06x}")
    print(f"  Upper half  = U+2580 (▀) = {ord('▀'):#06x}")
    print(f"  Lower half  = U+2584 (▄) = {ord('▄'):#06x}")
    print()

    print("Your Python encoding:")
    print(f"  stdout encoding: {sys.stdout.encoding}")
    print()

    print("If you see dashes (-) or underscores (_):")
    print("  1. Your font doesn't support these Unicode characters")
    print("  2. Your terminal encoding might not be UTF-8")
    print()

    print("Mac Terminal fixes:")
    print("  Option 1: Try a different font")
    print("    - Menlo (built-in, good Unicode support)")
    print("    - SF Mono (Apple's monospace font)")
    print("    - Monaco (older but reliable)")
    print("    - JetBrains Mono (excellent Unicode support)")
    print()
    print("  Option 2: If using Terminus specifically")
    print("    - Make sure you have 'Terminus (TTF)' not bitmap version")
    print("    - Some Terminus builds lack block characters")
    print()
    print("  Option 3: Check Terminal.app preferences")
    print("    - Preferences → Profiles → Advanced")
    print("    - Set character encoding to 'Unicode (UTF-8)'")
    print()
    print("  Option 4: We can use ASCII fallback characters")
    print("    - # or @ for filled pixels instead of █")
    print("    - Less pretty but works everywhere")


if __name__ == '__main__':
    main()
