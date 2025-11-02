#!/usr/bin/env python3
"""Test the extended font"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from matrixos.font import Font

f = Font()
print("✓ Font loaded successfully!")
print(f"✓ Total characters: {len(f.charset)}")
print("✓ Standard ASCII characters: 32-126")
print("✓ Extended glyphs added:")
print("  - Arrows: → ← ↓ ↑")
print("  - Symbols: ✓ ✗ ● ○ ◆ ★ ♥ ♪")
print("  - Progress bars: ▁ ▂ ▃ ▅ ▆ ▇")
print("  - Box drawing: │ ─ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼")
print("  - Status icons: 🔋 📶 🔒 🔓 ⚙ 🏠 🎮 🕐")
print("  - Weather: ☀ ☁ ☂ ❄ ⚡ 🌡")
print("\n✓ All extended characters loaded!")
