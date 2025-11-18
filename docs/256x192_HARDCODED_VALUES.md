# 256×192 Upgrade: Hardcoded Values Audit

## Complete list of all hardcoded dimensions requiring updates

---

## 1. Snake (`examples/snake/main.py`)

| Line | Current Code | New Value | Notes |
|------|--------------|-----------|-------|
| 46 | `start_x, start_y = 64, 64` | `128, 96` | Initial snake position (center) |
| 65 | `x = random.randint(2, 125) & ~3` | `random.randint(4, 252) & ~3` | Food spawn X bounds |
| 66 | `y = random.randint(2, 125) & ~3` | `random.randint(16, 188) & ~3` | Food spawn Y (leave top for HUD) |
| 124 | `new_head[0] >= 128` | `>= 256` | Wall collision X |
| 124 | `new_head[1] >= 128` | `>= 192` | Wall collision Y |
| 161 | `matrix.rect(0, 0, 128, 128, ...)` | `(0, 12, 256, 180, ...)` | Border (leave top/bottom) |
| 176 | `matrix.rect(0, 0, 128, 10, ...)` | `(0, 0, 256, 12, ...)` | HUD bar |
| 177 | `matrix.text(..., 2, 1, ...)` | `(4, 2, ...)` | Score position |
| 178 | `matrix.text(..., 75, 1, ...)` | `(180, 2, ...)` | High score position |
| 169 | `if len(self.snake) > 200` | `> 600` | Win condition (3× more cells) |

**Sprite Sizes:**
- Snake segment: Keep 4×4 or increase to 6×6
- Movement grid: 4 pixels per step

---

## 2. Frogger (`examples/frogger/main.py`)

| Line | Current Code | New Value | Notes |
|------|--------------|-----------|-------|
| 52 | `self.grid_size = 8` | `12` | Movement grid |
| 134 | `self.grid_size = 12` | Already correct | ✓ Already updated |
| 135 | `self.start_x = width // 2` | Uses parameter ✓ | Responsive |
| 136 | `self.start_y = height - 6` | Uses parameter ✓ | Responsive |
| 147 | `road_start_y = int(height * 0.641)` | Uses parameter ✓ | Proportional |
| 165 | `river_start_y = int(height * 0.250)` | Uses parameter ✓ | Proportional |

**Recommendations:**
- Increase vehicle widths: 16→24, 24→36
- Add more lanes: 3 road + 3 river → 5 road + 5 river
- Frog size: 6×6 → 8×8

**Status:** ✅ Already mostly responsive! Just needs sprite scaling.

---

## 3. Space Invaders (`examples/space_invaders/main.py`)

| Line | Current Code | New Value | Notes |
|------|--------------|-----------|-------|
| 29 | `self.player_x = (128 - 12) // 2` | `(256 - 16) // 2` | Player center (with new width) |
| 30 | `self.player_y = 110` | `170` | Player Y position |
| 31 | `self.player_width = 12` | `16` | Player width |
| 32 | `self.player_height = 8` | `10` | Player height |
| 41 | `self.alien_width = 10` | `14` | Alien width |
| 42 | `self.alien_height = 8` | `12` | Alien height |
| 73 | `rows = 4` | `5` | Alien rows |
| 73 | `cols = 8` | `12` | Alien columns |
| 74 | `spacing_x = 14` | `20` | Alien horizontal spacing |
| 114 | `min(128 - self.player_width, ...)` | `min(256 - self.player_width, ...)` | Right boundary |
| 147 | `if bullet['y'] > 128` | `> 192` | Bottom boundary |
| 159 | `rightmost >= 128` | `>= 256` | Alien right edge |

**Additional Changes Needed:**
- Shield bunkers (add new feature)
- Better HUD layout
- Explosion animations

---

## 4. Pac-Man (`examples/pacman/main.py`)

| Line | Current Code | New Value | Notes |
|------|--------------|-----------|-------|
| 28 | `self.size = 6` | `10` | Pac-Man size |
| 67 | `if self.x < 0` | Keep | Bounds check |
| 67 | `self.x = 128` | `192` | Wrap to right (for square maze) |
| 69 | `self.x > 128` | `> 192` | Right boundary |
| 69 | `self.x = 0` | Keep | Wrap to left |
| 90 | `self.size = 6` | `10` | Ghost size |

**Layout Strategy:**
- Use center 192×192 square for maze (keep 1:1 aspect)
- Left panel (32px): Lives, level
- Right panel (32px): Score, ghost status
- Scale entire maze 1.5× (192/128)

**Maze Coordinates:**
- Offset all by +32 (X axis)
- Scale all positions by 1.5×

---

## 5. Platformer (`examples/platformer/main.py`)

| Line | Current Code | New Value | Notes |
|------|--------------|-----------|-------|
| 29 | `self.player_x = 20` | `40` | Start position X |
| 30 | `self.player_y = 0` | `0` | Start Y (set in on_activate) |
| 32 | `self.player_width = 8` | `12` | Player width |
| 33 | `self.player_height = 10` | `16` | Player height |
| 63 | `self.player_y = 50` | `80` | Initial Y position |
| 79 | `{'x': 0, 'y': 108, 'width': 600, 'height': 10}` | `{'x': 0, 'y': 174, 'width': 1200, 'height': 10}` | Ground platform |
| 82-89 | Platform positions | Scale Y by 1.6× | All platform Y positions |
| 82-89 | Platform X positions | Keep or double | World width expansion |
| 127 | `min(550, self.player_x + ...)` | `min(1150, ...)` | Right world boundary |
| 219 | `self.camera_x = max(0, min(target_camera, 600 - 128))` | `max(0, min(target_camera, 1200 - 256))` | Camera bounds |
| 228 | `matrix.fill((50, 100, 150))` | Keep | Background color |

**World Expansion:**
- Width: 600 → 1200 pixels
- Viewport: 128 → 256 pixels
- Ground: Y=108 → Y=174

---

## 6. Tetris (`examples/tetris/main.py`)

| Line | Current Code | New Value | Notes |
|------|--------------|-----------|-------|
| 54 | `self.block_size = 5` | `8` | Tetromino block size |
| 55 | `self.field_x = 8` | `48` | Playfield X offset (center with panels) |
| 56 | `self.field_y = 8` | `16` | Playfield Y offset |

**Layout Calculation:**
- Playfield: 10×20 blocks at 8px = 80×160
- Center horizontally: (256 - 80) / 2 = 88, but leave 48px for left panel → X=48
- Center vertically: (192 - 160) / 2 = 16 → Y=16

**Panel Layout:**
- Left panel (0-48): Level, Lines, Score
- Game area (48-128): 80px playfield
- Right panel (128-256): Next piece, Hold piece, controls

---

## 7. Breakout (`examples/breakout/main.py`)

| Line | Current Code | New Value | Notes |
|------|--------------|-----------|-------|
| 29 | `self.paddle_width = 20` | `32` | Paddle width |
| 57 | `self.paddle_x = (128 - self.paddle_width) // 2` | `(256 - self.paddle_width) // 2` | Center paddle |
| 58 | `self.paddle_y = 118` | `180` | Paddle Y position |
| 62 | `self.ball_x = 62` | `124` | Ball start X (center) |
| 75 | `cols = 8` | `16` | Brick columns |
| 76 | `rows = 6` | `8` | Brick rows |
| 78 | `start_x = (128 - (cols * ...` | `(256 - (cols * ...` | Center bricks |
| 119 | `min(128 - self.paddle_width, ...)` | `min(256 - self.paddle_width, ...)` | Right boundary |
| 145 | `if self.ball_y >= 128` | `>= 192` | Bottom boundary |

**Brick Calculation:**
- Width: 14px (keep)
- Height: 6px (keep)
- Spacing: 2px (keep)
- Columns: 16 (double)
- Rows: 8 (increase)

---

## 8. Clock (`examples/clock/main.py`)

| Line | Current Code | New Value | Notes |
|------|--------------|-----------|-------|
| 64 | `self.draw_analog_clock(matrix, 64, 64, 50)` | `(128, 96, 80)` | Center and radius |
| 68 | `matrix.text(date_str, 25, 5, ...)` | `(90, 8, ...)` | Date position |
| 75 | `matrix.text(time_str, 15, 50, ...)` | `(70, 80, ...)` | Time position |
| 79 | `matrix.text(date_str, 25, 20, ...)` | `(80, 32, ...)` | Date in digital mode |
| 80 | `matrix.text(date_str2, 10, 85, ...)` | `(50, 130, ...)` | Full date |
| 85 | `self.draw_analog_clock(matrix, 64, 45, 35)` | `(64, 70, 55)` | Both mode - analog |
| 88 | `matrix.text(time_str, 30, 95, ...)` | `(90, 145, ...)` | Both mode - digital |
| 91 | `matrix.text(date_str, 25, 5, ...)` | `(80, 8, ...)` | Both mode - date |

**Multiple Modes:**
- Analog-only: Large clock, radius 80, center (128, 96)
- Digital-only: Large centered text
- Both: Split screen or different layout

---

## 9. News (`examples/news/main.py`)

| Line | Current Code | New Value | Notes |
|------|--------------|-----------|-------|
| 17 | `self.scroll_x = 128` | `256` | Scroll start position |
| 41 | `self.scroll_x = 128` | `256` | Scroll reset |
| 77 | `text_width = len(current_text) * 6` | Keep | Character width estimate |
| 81 | `if self.scroll_x < -text_width: self.scroll_x = 128` | `256` | Wrap scroll |
| 99 | `matrix.rect(0, 0, 128, 20, ...)` | `(0, 0, 256, 24, ...)` | Header bar |
| 100 | `matrix.text("LIVE NEWS", 25, 5, ...)` | `(90, 6, ...)` | Title position |
| 103 | `matrix.text(headline_info, 85, 5, ...)` | `(200, 6, ...)` | Counter position |
| 106 | `matrix.line(0, 60, 128, 60, ...)` | `(0, 90, 256, 90, ...)` | Divider line |
| 108 | `matrix.text(current_text, self.scroll_x, 40, ...)` | `(..., 50, ...)` | Headline Y |
| 113 | `matrix.text("UP/DOWN: Navigate", 10, 70, ...)` | `(20, 110, ...)` | Instructions 1 |
| 114 | `matrix.text("OK: Refresh", 10, 85, ...)` | `(20, 130, ...)` | Instructions 2 |
| 118 | `matrix.text(update_text, 10, 105, ...)` | `(20, 165, ...)` | Update time |

---

## 10. Weather (`examples/weather/main.py`)

**Note:** Most positioning is implicit through text() calls. Need to refactor for 256×192.

**Recommended Layout:**
```
Top (256×48): City, Current Temp (large), Condition
Middle (256×96): Large icon + details panel  
Bottom (256×48): 5-day forecast
```

**Text Size Recommendations:**
- City name: 8px height
- Current temp: 24px height (large)
- Details: 6px height
- Forecast: 6px height

---

## 11. Timer (`examples/timer/main.py`)

| Line | Status | Notes |
|------|--------|-------|
| ALL | ✅ Uses `matrix.width` and `matrix.height` | Already responsive! |
| 169 | ✅ Uses `layout.center_text()` | Layout helpers |

**Recommendations:**
- Increase countdown number size (24px → 48px tall)
- Larger progress circle (radius 60 → 80)
- Grid layout for presets (3×2 instead of list)

---

## 12. Demos (`examples/demos/main.py`)

| Line | Status | Notes |
|------|--------|-------|
| 105 | ✅ Uses `scale = width / 64` | Scaling factor |
| 114-129 | ✅ Scales shapes properly | Responsive |
| Most | ✅ Uses `matrix.width/height` | Already responsive |

**Status:** Already handles resolution changes well!

**Enhancements:**
- Add more demo types for larger canvas
- More detail in plasma/rainbow effects

---

## 13. Emoji Demo (`examples/emoji_demo/main.py`)

| Line | Current Code | New Value | Notes |
|------|--------------|-----------|-------|
| 15 | `x=64, y=64` | `x=128, y=96` | Player start position |
| 16 | `size=20` | `size=24` | Player sprite size |
| 26 | `x=20 + i * 25` | `x=24 + i * 32` | Coin X positions |
| 27 | `y=20` | `y=24` | Coin Y position |
| 29 | `size=12` | `size=16` | Coin size |
| 38 | `x=30 + i * 35` | `x=40 + i * 48` | Obstacle X positions |
| 39 | `y=100` | `y=140` | Obstacle Y position |
| 41 | `size=16` | `size=20` | Obstacle size |
| 47 | `x=10, y=100` | `x=16, y=140` | Star position |
| 49 | `size=14` | `size=18` | Star size |
| 108 | `if self.player.x < 0` | Keep | Left boundary |
| 110 | `elif self.player.x + self.player.width > 128` | `> 256` | Right boundary |
| 111 | `self.player.x = 128 - self.player.width` | `256 - ...` | Constrain right |
| 114 | `if self.player.y < 0` | Keep | Top boundary |
| 116 | `elif self.player.y + self.player.height > 128` | `> 192` | Bottom boundary |
| 117 | `self.player.y = 128 - self.player.height` | `192 - ...` | Constrain bottom |

---

## 14. Settings (`matrixos/apps/settings/main.py`)

| Line | Status | Notes |
|------|--------|-------|
| 177 | Position hardcoded | `matrix.text("SETTINGS", 2, 2, ...)` |
| 180 | ✅ Uses `layout.menu_list()` | Responsive |
| 183 | Uses `matrix.height` | `matrix.text(..., 2, matrix.height - 8, ...)` |
| Most | ✅ Responsive | Uses matrix dimensions |

**Status:** Already mostly responsive!

**Enhancements:**
- Two-column layout (menu left, details right)
- Larger text for readability
- Visual setting previews

---

## Summary Statistics

| App | Hardcoded Values | Difficulty | Status |
|-----|------------------|------------|--------|
| Snake | 9 locations | Easy | Not started |
| Frogger | 0 (responsive!) | Easy | Mostly done ✓ |
| Space Invaders | 12 locations | Medium | Not started |
| Pac-Man | 6 locations + maze | Hard | Not started |
| Platformer | 12 locations | Medium | Not started |
| Tetris | 3 locations | Easy | Not started |
| Breakout | 10 locations | Medium | Not started |
| Clock | 10 locations | Easy | Not started |
| News | 12 locations | Easy | Not started |
| Weather | ~8 locations | Medium | Not started |
| Timer | 0 (responsive!) | Easy | Done ✓ |
| Demos | 0 (responsive!) | N/A | Done ✓ |
| Emoji Demo | 15 locations | Easy | Not started |
| Settings | 1 location | Easy | Mostly done ✓ |

**Total Hardcoded References:** ~98 locations across 14 apps  
**Average per app:** ~7 hardcoded values  
**Responsive apps:** 3/14 (Timer, Demos, partially Frogger)

---

## Global Search Commands

```bash
# Find all 128 references
grep -rn "\b128\b" examples/*/main.py matrixos/apps/*/main.py

# Find all 64 references (common center point)
grep -rn "\b64\b" examples/*/main.py

# Find boundary comparisons
grep -rn "< 128\|> 128\|<= 128\|>= 128" examples/*/main.py

# Find all rect() calls that might use fixed dimensions
grep -rn "matrix\.rect(" examples/*/main.py | grep -E "\b128\b"
```

---

*This audit provides line-by-line details for updating each app to 256×192 resolution.*
