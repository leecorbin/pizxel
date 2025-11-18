# 256×192 Upgrade Quick Reference

## Resolution Comparison
- **Old:** 128×128 (16,384 pixels, 1:1 aspect)
- **New:** 256×192 (49,152 pixels, 4:3 aspect)
- **Increase:** 3× total pixels, 2× width, 1.5× height

## Common Transformations

### Center Points
```python
# 128×128 → 256×192
(64, 64) → (128, 96)
```

### Boundaries
```python
# Width bounds
0-128 → 0-256

# Height bounds  
0-128 → 0-192
```

### HUD Layouts
```python
# Top HUD bar
OLD: matrix.rect(0, 0, 128, 10, ...)
NEW: matrix.rect(0, 0, 256, 12, ...)

# Bottom status bar
OLD: y = 122
NEW: y = 180
```

### Standard Game Layouts

#### Full Screen (Simple Games)
```python
# Use entire 256×192 area
game_area = (0, 12, 256, 180)  # Leave 12px for HUD
```

#### Center Square (Maze Games)
```python
# Keep 1:1 aspect ratio, use side panels
game_area = (32, 0, 192, 192)  # Center 192×192 square
left_panel = (0, 0, 32, 192)
right_panel = (224, 0, 32, 192)
```

#### Full Width (Scrollers)
```python
# Use full width, natural height
game_area = (0, 0, 256, 192)
```

## Sprite Size Guidelines

| Type | 128×128 | 256×192 | Use Case |
|------|---------|---------|----------|
| Tiny | 4×4 | 6×6 | Dots, bullets |
| Small | 6×6 | 10×10 | Characters, enemies |
| Medium | 8×8 | 12×12 | Player sprites |
| Large | 12×12 | 16×16 | Vehicles, items |
| XLarge | 16×16 | 24×24 | Bosses, special |

## Text Positioning

### Header Text
```python
# Title at top
OLD: matrix.text("Title", 2, 2, ...)
NEW: matrix.text("Title", 4, 4, ...)  # More padding
```

### Centered Text
```python
# Use centered_text when available
OLD: matrix.centered_text("Text", 64, ...)
NEW: matrix.centered_text("Text", 96, ...)
```

### HUD Elements
```python
# Left-aligned score
OLD: matrix.text("Score: 100", 2, 2, ...)
NEW: matrix.text("Score: 100", 4, 4, ...)

# Right-aligned high score
OLD: matrix.text("Hi: 500", 75, 2, ...)
NEW: matrix.text("Hi: 500", 180, 4, ...)
```

## Grid-Based Games

### Snake
```python
OLD_GRID = 4  # 4px per segment
NEW_GRID = 6  # 6px per segment

OLD_CELLS = 32×32 (128/4)
NEW_CELLS = 42×32 (256/6 × 192/6)
```

### Tetris
```python
OLD_BLOCK = 5  # 5px per block
NEW_BLOCK = 8  # 8px per block

# 10×20 grid
OLD_PLAYFIELD = 50×100
NEW_PLAYFIELD = 80×160
```

## Common Issues to Watch

### ❌ Hardcoded Dimensions
```python
# BAD - Don't do this
if x > 128: ...
y = 64
for i in range(128): ...
```

### ✅ Responsive Code
```python
# GOOD - Use matrix dimensions
if x > matrix.width: ...
y = matrix.height // 2
for i in range(matrix.width): ...
```

### ❌ Pixel-Perfect Assumptions
```python
# BAD - Assumes exact positioning
player_x = 64  # Center of 128
```

### ✅ Calculated Positions
```python
# GOOD - Calculate from dimensions
player_x = matrix.width // 2  # Always centered
```

## Priority Checklist

When upgrading an app:

- [ ] Find all instances of `128` and `64` (grep search)
- [ ] Update center points: `64 → 128` (width), `64 → 96` (height)
- [ ] Update boundaries: `128 → 256` (width), `128 → 192` (height)
- [ ] Scale sprite sizes (usually 1.5× to 2×)
- [ ] Update HUD layout (add panels if needed)
- [ ] Adjust game speeds/spawning for new space
- [ ] Test collision detection (more area = harder?)
- [ ] Verify text positioning and readability
- [ ] Check frame rate (3× more pixels!)
- [ ] Test all game states (menu, play, game over)

## Grep Search Commands

Find hardcoded dimensions:
```bash
# Find literal 128
grep -n "128" examples/snake/main.py

# Find common dimension patterns
grep -nE "\b(64|128)\b" examples/*/main.py

# Find boundary checks
grep -n "< 128\|> 128\|<= 128\|>= 128" examples/*/main.py
```

## Testing Procedure

1. **Visual:** Does it fill the screen? Any clipping?
2. **Functional:** Do all features work? Any crashes?
3. **Performance:** Still hitting 60 FPS?
4. **Polish:** Does it look good? Professional?

## Standard Panel Sizes

```python
# For arcade games with side panels
LEFT_PANEL_WIDTH = 32
RIGHT_PANEL_WIDTH = 32
GAME_AREA_WIDTH = 192  # 256 - 32 - 32

# Standard HUD heights
TOP_HUD_HEIGHT = 12
BOTTOM_HUD_HEIGHT = 12
GAME_AREA_HEIGHT = 168  # 192 - 12 - 12
```

## Example: Snake Upgrade

```python
# Start position
OLD: (64, 64)
NEW: (128, 96)

# Food spawn bounds
OLD: random.randint(2, 125)
NEW: random.randint(4, 252)  # Width
NEW: random.randint(16, 188)  # Height (account for HUD)

# Border
OLD: matrix.rect(0, 0, 128, 128, ...)
NEW: matrix.rect(0, 12, 256, 180, ...)  # Leave top for HUD

# HUD bar
OLD: matrix.rect(0, 0, 128, 10, ...)
NEW: matrix.rect(0, 0, 256, 12, ...)
```

## ZX Spectrum Color Palette

Use these colors for authentic retro look:
```python
BLACK = (0, 0, 0)
BLUE = (0, 0, 215)
RED = (215, 0, 0)
MAGENTA = (215, 0, 215)
GREEN = (0, 215, 0)
CYAN = (0, 215, 215)
YELLOW = (215, 215, 0)
WHITE = (215, 215, 215)

# Bright variants (add +40 to each channel)
BRIGHT_BLUE = (0, 0, 255)
BRIGHT_RED = (255, 0, 0)
# etc.
```

## Remember!

> "Look like 1983, work like 2025."

- Keep chunky pixels and retro aesthetic
- Use extra space wisely (don't just scale up)
- Add features where space allows (HUD, panels, details)
- Maintain 60 FPS performance
- Test on actual hardware dimensions
