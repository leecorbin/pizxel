# MatrixOS 256×192 Resolution Upgrade Plan
## ZX Spectrum Standard Resolution

**Target Resolution:** 256×192 pixels (ZX Spectrum standard)  
**Current Resolution:** 128×128 pixels  
**Aspect Ratio:** 4:3 (1.33:1) vs current 1:1

---

## 📊 Executive Summary

This upgrade doubles the horizontal resolution and increases vertical by 50%, providing **49,152 total pixels** (vs 16,384 current) - a **3× increase** in screen real estate. This allows for:

- Larger, more detailed sprites and graphics
- Better text rendering with more characters on screen
- Room for dedicated UI panels (score, info, controls)
- More game elements visible simultaneously
- Enhanced retro aesthetic matching ZX Spectrum heritage

---

## 🎮 Game Apps Analysis

### 1. **Snake** (`examples/snake/main.py`)
**Purpose:** Classic snake game with grow-by-eating-food gameplay  
**Current Layout:** 128×128 playfield with 4×4 pixel snake segments

**Hardcoded Values:**
- Line 46: `start_x, start_y = 64, 64` - Snake start position
- Line 65: `x = random.randint(2, 125) & ~3` - Food spawn X bounds
- Line 66: `y = random.randint(2, 125) & ~3` - Food spawn Y bounds
- Line 124: `if (new_head[0] < 0 or new_head[0] >= 128 or new_head[1] < 0 or new_head[1] >= 128)` - Wall collision
- Line 161: `matrix.rect(0, 0, 128, 128, ...)` - Border
- Line 176: `matrix.rect(0, 0, 128, 10, ...)` - HUD bar
- Line 178: `matrix.text(f"Hi:{self.high_score}", 75, 1, ...)` - High score position

**Recommendations for 256×192:**
- **Game area:** Use full 256×192 (no side panels needed for this simple game)
- **Snake segments:** Keep at 4×4 or increase to 6×6 for better visibility
- **Start position:** `(128, 96)` - center of new resolution
- **Food spawn:** `x: 4-252, y: 14-188` (account for HUD and border)
- **Border:** `matrix.rect(0, 12, 256, 180, ...)` - leave room for HUD
- **HUD:** Expand to `matrix.rect(0, 0, 256, 12, ...)` - top 12 pixels
- **Score layout:** `Score: 4,1` and `High Score: 180,1` - spread across width
- **Win condition:** Increase from 200 segments to 600+ (3× more space)

**Visual Improvements:**
- Add decorative border patterns in ZX Spectrum style
- Larger text (8px height instead of 6px)
- More dynamic background colors
- Show snake length count in HUD

**Priority:** HIGH - Popular arcade game, very visible improvement

---

### 2. **Frogger** (`examples/frogger/main.py`)
**Purpose:** Cross road and river to reach home safely  
**Current Layout:** Road (3 lanes), safe zone, river (3 lanes), goal zones

**Hardcoded Values:**
- Line 52: `grid_size = 8` - Movement grid
- Line 135: `self.start_x = width // 2` - Uses width parameter (good!)
- Line 136: `self.start_y = height - 6` - Uses height parameter (good!)
- Line 147: `road_start_y = int(height * 0.641)` - Proportional (good!)
- Line 165: `river_start_y = int(height * 0.250)` - Proportional (good!)
- Multiple vehicle/log creation loops reference lane positions

**Recommendations for 256×192:**
- **Grid size:** Increase from 8 to 12 pixels (already implemented at line 134)
- **Frog sprite:** 8×8 pixels (up from 6×6)
- **Add 2 more lanes:** 5 road lanes + 5 river lanes (vs 3+3)
- **Vehicle sizes:** Scale up 1.5× (24px cars, 36px trucks vs 16/24)
- **Add side panels:** 
  - Left 32px: Lives display with frog icons
  - Right 32px: Level indicator and timer
  - Center 192px: Active playfield
- **Goal zones:** 5 homes at top instead of random spawns

**Visual Improvements:**
- Larger, more detailed vehicles (add wheels, windows)
- Animated water ripples in river
- Distinct vehicle types per lane (cars, trucks, race cars)
- Animated goal zone indicators
- Timer countdown bar

**Priority:** HIGH - Complex game with lots of elements, great showcase

---

### 3. **Space Invaders** (`examples/space_invaders/main.py`)
**Purpose:** Classic arcade shooter with descending alien waves  
**Current Layout:** 8×4 alien grid, player at bottom, HUD at top/bottom edges

**Hardcoded Values:**
- Line 29: `self.player_x = (128 - 12) // 2` - Player center position
- Line 30: `self.player_y = 110` - Player Y position
- Line 73: `rows = 4`, `cols = 8` - Alien formation
- Line 114: `self.player_x = min(128 - self.player_width, ...)` - Right boundary
- Line 147: `if bullet['y'] > 128` - Bottom boundary

**Recommendations for 256×192:**
- **Game area:** Left 32px panel (lives/wave), center 192px game, right 32px panel (power-ups/score)
- **Alien formation:** 12 columns × 5 rows (vs 8×4) = 60 aliens
- **Alien size:** Increase from 10×8 to 14×12 pixels
- **Player ship:** 16×10 pixels (from 12×8)
- **Spacing:** More room between aliens (20px vs 14px)
- **Player Y:** 170 (vs 110) - more vertical space for action
- **Bullet speed:** Adjust for taller screen
- **Add features:**
  - Shield bunkers (4 destructible barriers)
  - UFO bonus ship at top
  - Particle effects for explosions
  - Power-up system (rapid fire, shield)

**Visual Improvements:**
- Animated alien sprites (2 frames per alien type)
- Colorful explosion effects
- Starfield background
- Mother ship bonus rounds
- Better HUD with ship lives display

**Priority:** HIGH - Iconic game, animations will look much better

---

### 4. **Pac-Man** (`examples/pacman/main.py`)
**Purpose:** Navigate maze, eat dots, avoid/chase ghosts  
**Current Layout:** Maze fills 128×128 with tight corridors

**Hardcoded Values:**
- Line 28: `self.size = 6` - Pac-Man size
- Line 67: `if self.x < 0` and `elif self.x > 128` - Screen wrapping
- Line 90: `self.size = 6` - Ghost size
- Multiple maze coordinate references

**Recommendations for 256×192:**
- **Game area:** Center 192×192 square for maze (maintain 1:1 aspect ratio)
- **Side panels:** 
  - Left 32px: Lives, level, fruit
  - Right 32px: Ghost mode indicators, score
- **Sprite sizes:** 
  - Pac-Man: 10×10 pixels (from 6×6)
  - Ghosts: 10×10 pixels (from 6×6)
  - Dots: 2×2 pixels
  - Power pellets: 6×6 pixels (animated pulse)
- **Maze:** Scale up 1.5× with wider corridors
- **Add features:**
  - Fruit bonus icons in side panels
  - Ghost "eyes" when returning to base
  - Score popup when eating ghosts
  - Ready/Game Over animations

**Visual Improvements:**
- More detailed ghost sprites (eyes look in direction of travel)
- Better Pac-Man mouth animation (3 frames)
- Maze wall patterns (ZX Spectrum style)
- Animated power pellets
- Level intermissions

**Priority:** HIGH - Complex game, maze can use extra space

---

### 5. **Platformer** (`examples/platformer/main.py`)
**Purpose:** Side-scrolling jump-and-run with coins and enemies  
**Current Layout:** Horizontal scrolling world, 128px viewport

**Hardcoded Values:**
- Line 29: `self.player_x = 20` - Start position
- Line 79: `{'x': 0, 'y': 108, 'width': 600, 'height': 10}` - Ground platform
- Line 127: `self.player_x = min(550, self.player_x + ...)` - Right boundary
- Line 219: Camera uses `600 - 128` - World vs viewport
- Line 228: `matrix.fill((50, 100, 150))` - Background
- Multiple platform Y positions hardcoded

**Recommendations for 256×192:**
- **Viewport:** Full 256×192 (double horizontal view!)
- **World width:** Expand from 600 to 1200+ pixels
- **Player sprite:** 12×16 pixels (from 8×10)
- **Platforms:** Scale heights proportionally, add more vertical layers
- **Camera:** Follow player with `viewport_width = 256`, `viewport_height = 192`
- **Ground level:** Y=174 (from 108)
- **Add features:**
  - Parallax background layers (mountains, clouds)
  - More enemy types
  - Moving platforms
  - Double-jump mechanic
  - Checkpoint flags

**Visual Improvements:**
- Layered parallax scrolling backgrounds
- Larger, more detailed sprites with animation frames
- Particle effects for jumps/landings
- Better collision visual feedback
- Environmental details (grass, trees, clouds)

**Priority:** MEDIUM - Good showcase for scrolling, but already uses proportional camera

---

### 6. **Tetris** (`examples/tetris/main.py`)
**Purpose:** Falling block puzzle game  
**Current Layout:** 10×20 playfield at 5px blocks = 50×100 game area, HUD on right

**Hardcoded Values:**
- Line 54: `self.block_size = 5` - Tetromino block size
- Line 55: `self.field_x = 8` - Playfield X offset
- Line 56: `self.field_y = 8` - Playfield Y offset
- Line 54-55: `self.field_width = 10`, `self.field_height = 20` - Grid dimensions

**Recommendations for 256×192:**
- **Block size:** Increase from 5 to 8 pixels
- **Playfield:** 10×20 grid = 80×160 pixels (centered)
- **Playfield position:** X=48, Y=16 (centered in 256×192)
- **Left panel (48px):**
  - Level indicator
  - Lines cleared
  - High score
- **Right panel (128px):**
  - Large "Next Piece" preview (32×32)
  - "Hold Piece" feature (32×32)
  - Score with larger text
  - Speed/level indicator
- **Add features:**
  - Hold piece mechanic (C key)
  - Ghost piece (preview landing position)
  - Combo counter
  - Background pattern animations

**Visual Improvements:**
- Gradient fills on blocks
- Better border graphics around playfield
- Animated line clear effect
- Particle effects for Tetris (4-line clear)
- Level-based background colors

**Priority:** MEDIUM - Classic game, better UI/preview areas are nice

---

### 7. **Breakout** (`examples/breakout/main.py`)
**Purpose:** Brick-breaking with paddle and ball  
**Current Layout:** 8 columns × 6 rows of bricks at top, paddle at bottom

**Hardcoded Values:**
- Line 29: `self.paddle_width = 20` - Paddle size
- Line 30: `self.paddle_y = 0` - Set in on_activate
- Line 57: `self.paddle_x = (128 - self.paddle_width) // 2` - Center paddle
- Line 58: `self.paddle_y = 118` - Paddle Y position
- Line 75: `cols = 8` - Brick columns
- Line 78: `start_x = (128 - (cols * (self.brick_width + spacing) ...` - Center bricks
- Line 119: `self.paddle_x = min(128 - self.paddle_width, ...)` - Right boundary
- Line 145: `if self.ball_y >= 128` - Ball off bottom

**Recommendations for 256×192:**
- **Game area:** Full 256×192 with symmetric borders
- **Brick grid:** 16 columns × 8 rows (double current)
- **Brick size:** 14×6 pixels (same as current)
- **Paddle:** 32×4 pixels (from 20×4) - proportionally wider
- **Ball:** 4×4 pixels (same)
- **Paddle Y:** 180 (from 118)
- **Bottom boundary:** 192
- **Add features:**
  - Power-ups drop from bricks (multi-ball, paddle extend, laser, catch)
  - Brick hit points (some require 2-3 hits)
  - Background grid pattern
  - Ball trails

**Visual Improvements:**
- Animated power-up capsules falling
- Better explosion effects when bricks break
- Paddle glow effect
- Ball motion blur
- Score popups at brick locations

**Priority:** MEDIUM - Good showcase for brick patterns and power-ups

---

### 8. **Clock** (`examples/clock/main.py`)
**Purpose:** Analog and digital time display  
**Current Layout:** Analog clock centered, digital time below, date at top

**Hardcoded Values:**
- Line 64: `self.draw_analog_clock(matrix, 64, 64, 50)` - Center position and radius
- Line 68: `matrix.text(date_str, 25, 5, ...)` - Date position
- Line 75: `matrix.text(time_str, 15, 50, ...)` - Time position
- Various positioning for different modes

**Recommendations for 256×192:**
- **Analog-only mode:**
  - Clock radius: 80 pixels (from 50) - much more detailed
  - Center: (128, 96)
  - Room for date, day, and timezone below
- **Digital-only mode:**
  - Large time display: centered with 2× scale font
  - Date and day in elegant layout
  - World clock panel (show 3 timezones)
- **Both mode:**
  - Analog on left (128×192): radius 70, center (64, 96)
  - Digital on right (128×192): time, date, seconds bar
- **Add features:**
  - Second markers on clock face
  - Roman numerals option
  - Multiple timezone clocks
  - Stopwatch mode
  - Countdown timer integration

**Visual Improvements:**
- Gradient clock face
- Ornate hour markers
- Drop shadows on hands
- Smooth second hand animation (not just jumps)
- Beautiful typography for digital display

**Priority:** LOW - Functional app, but more space allows elegance

---

### 9. **News** (`examples/news/main.py`)
**Purpose:** Scrolling news headlines with category selection  
**Current Layout:** Title bar at top, scrolling text in middle, instructions at bottom

**Hardcoded Values:**
- Line 17: `self.scroll_x = 128` - Scroll start position
- Line 41: `self.scroll_x = 128` - Reset scroll
- Line 77: `text_width = len(current_text) * 6` - Approximate width
- Line 81: `if self.scroll_x < -text_width: self.scroll_x = 128` - Wrap
- Line 99: `matrix.rect(0, 0, 128, 20, ...)` - Header bar
- Line 106: `matrix.line(0, 60, 128, 60, ...)` - Divider
- Multiple text positions hardcoded

**Recommendations for 256×192:**
- **Layout:**
  - Top banner (256×24): "LIVE NEWS" with category tabs
  - Main area (256×120): Multiple scrolling headlines (3-4 at once)
  - Bottom panel (256×48): Controls, last update, article preview
- **Scroll speed:** Keep at 1px but with more text visible
- **Scroll reset:** `self.scroll_x = 256`
- **Text width calc:** `len(text) * 6` (same)
- **Add features:**
  - Category filtering (Tech, Sports, World, etc.)
  - RSS feed configuration
  - Article preview on selection
  - Read/unread indicators
  - Favicon icons next to headlines

**Visual Improvements:**
- Color-coded categories
- Breaking news banner animation
- Fade in/out transitions between headlines
- Multiple headlines visible simultaneously
- Better typography

**Priority:** MEDIUM - Great for showing text capabilities

---

### 10. **Weather** (`examples/weather/main.py`)
**Purpose:** Display current weather with background updates  
**Current Layout:** City name, temperature, condition icon, forecast

**Hardcoded Values:**
- Most positioning done via text() calls with hardcoded X/Y
- No explicit 128 references found, but layout assumes small screen

**Recommendations for 256×192:**
- **Layout:**
  - Top (256×48): City name, current temperature (large), condition
  - Middle (256×96): 
    - Left half: Large weather icon (64×64 emoji or animation)
    - Right half: Details (humidity, wind, pressure, feels-like)
  - Bottom (256×48): 5-day forecast with mini icons and temps
- **Add features:**
  - Hourly forecast graph
  - Weather alerts banner
  - Sunrise/sunset times with icon
  - UV index
  - Precipitation probability bar
  - Wind direction compass

**Visual Improvements:**
- Animated weather conditions (rain falling, clouds moving, snow)
- Temperature graph over time
- Color-coded temperature scale
- Weather icons with more detail
- Gradient backgrounds matching conditions

**Priority:** MEDIUM - Nice showcase for data visualization

---

### 11. **Timer** (`examples/timer/main.py`)
**Purpose:** Countdown timer with background alerts  
**Current Layout:** Preset selection or countdown display with progress bar

**Hardcoded Values:**
- Uses `matrix.width` and `matrix.height` - already responsive! ✓
- Line 169: `layout.center_text(...)` - Uses layout helpers ✓

**Recommendations for 256×192:**
- **Timer display:**
  - Huge countdown numbers (centered, 48px tall)
  - Circular progress indicator (radius 80)
  - Time remaining bar below
- **Preset selection:**
  - Grid of preset buttons (3×2 grid)
  - Custom time entry field
- **Add features:**
  - Multiple concurrent timers
  - Timer presets with names ("Tea", "Eggs", "Workout")
  - Visual indicator modes (full screen flash, corner indicator)
  - Sound selection

**Visual Improvements:**
- Animated countdown (scale/pulse effect)
- Progress ring around numbers
- Color changes as time runs low (green→yellow→red)
- Decorative elements around timer
- Better alarm screen

**Priority:** LOW - Already uses responsive layout helpers

---

### 12. **Demos** (`examples/demos/main.py`)
**Purpose:** Showcase LED matrix capabilities with visual effects  
**Current Layout:** Menu with 8 demos (text, shapes, colors, etc.)

**Hardcoded Values:**
- Line 105: Uses scale factor `scale = width / 64` ✓
- Line 114-129: Shapes demo scales properly ✓
- Most demos use matrix.width/height - already responsive! ✓

**Recommendations for 256×192:**
- **Already well-designed!** Uses scaling and responsive layout
- **Enhancements:**
  - Add more demo types:
    - Sprite animation demo
    - Particle systems
    - Physics simulation (bouncing balls)
    - Conway's Game of Life
    - Fire effect
    - Matrix rain effect
  - Plasma demo can use full resolution for more detail
  - Text demo can show more font sizes

**Visual Improvements:**
- Larger pattern iterations in plasma/rainbow
- More particles in animation demos
- Side-by-side comparison mode
- Performance counter (FPS display)

**Priority:** LOW - Already handles resolution changes well

---

### 13. **Emoji Demo** (`examples/emoji_demo/main.py`)
**Purpose:** Demonstrate emoji sprite system  
**Current Layout:** Player sprite with coins and obstacles on 128×128 field

**Hardcoded Values:**
- Line 15: `x=64, y=64` - Player start (hardcoded center)
- Line 26: `x=20 + i * 25` - Coin positions
- Line 38: `x=30 + i * 35` - Obstacle positions
- Line 108-118: Bounds checking `if self.player.x < 0`, `> 128`

**Recommendations for 256×192:**
- **Player start:** `(128, 96)` - new center
- **Sprite sizes:** 
  - Player: 24×24 (from 20×20)
  - Coins: 16×16 (from 12×12)
  - Obstacles: 20×20 (from 16×16)
- **Layout:** 
  - Coins in 8 positions across top: `x=24 + i*32, y=24`
  - Obstacles in 5 positions: `x=40 + i*48, y=140`
- **Bounds:** Update to `0 to 256` and `0 to 192`
- **Add features:**
  - More sprite types
  - Sprite layering demo
  - Animation demo
  - Collision effect particles

**Visual Improvements:**
- Background grid
- Particle effects on collection
- Trail effects
- Score display
- Lives indicators

**Priority:** LOW - Demo app, but good reference implementation

---

### 14. **Settings** (`matrixos/apps/settings/main.py`)
**Purpose:** Configure MatrixOS system settings  
**Current Layout:** Menu list with detail screens

**Hardcoded Values:**
- Line 177: `matrix.text("SETTINGS", 2, 2, ...)` - Title
- Line 180: Uses `layout.menu_list(...)` - responsive ✓
- Line 183: `matrix.text("^v:NAV ENTER:SELECT", 2, matrix.height - 8, ...)` - Footer
- Most layout uses matrix.width/height - responsive ✓

**Recommendations for 256×192:**
- **Already well-designed!** Uses layout helpers
- **Enhancements:**
  - Two-column layout: menu on left (96px), details on right (160px)
  - Visual preview panes for settings
  - Larger text for readability
  - Icon previews for resolution/display settings
  - Network connection status display
  - Storage usage bars

**Visual Improvements:**
- Icons next to menu items
- Setting value previews in menu
- Color-coded categories
- Better typography
- Visual indicators for enabled/disabled states

**Priority:** LOW - Already responsive, but can add polish

---

## 📋 Implementation Priority Matrix

### Phase 1: High Priority (Weeks 1-2)
1. **Snake** - Simple, great showcase for pixel-perfect grid games
2. **Frogger** - Complex lanes, good test of layout scaling
3. **Space Invaders** - Iconic arcade game, needs new formation logic
4. **Pac-Man** - Complex maze, critical retro title

### Phase 2: Medium Priority (Weeks 3-4)
5. **Platformer** - Scrolling mechanics, parallax potential
6. **Tetris** - Classic puzzle, better UI space
7. **Breakout** - Power-up system showcase
8. **News** - Text rendering showcase
9. **Weather** - Data visualization showcase

### Phase 3: Low Priority (Week 5)
10. **Clock** - Aesthetic improvements, low priority
11. **Timer** - Already responsive, minor tweaks
12. **Demos** - Already responsive, add new demos
13. **Emoji Demo** - Reference implementation
14. **Settings** - Already responsive, polish only

---

## 🔧 Framework Changes Needed

### Core Display System
- [ ] Update default resolution from 128×128 to 256×192
- [ ] Update `matrixos/display.py` for new dimensions
- [ ] Update `matrixos/led_api.py` matrix creation
- [ ] Ensure all matrix methods work at new resolution

### Layout Helpers (`matrixos/layout.py`)
- [ ] Add `get_standard_game_area()` → returns (x, y, width, height) for 192×192 center
- [ ] Add `get_side_panel_left()` → returns (0, 0, 32, 192)
- [ ] Add `get_side_panel_right()` → returns (224, 0, 32, 192)
- [ ] Update `get_icon_size()` to return appropriate sizes for 256×192
- [ ] Add `scale_from_128()` helper to convert old coordinates

### Font System
- [ ] Verify font rendering at new resolution
- [ ] Consider 2× scale font option for large text
- [ ] Add text measurement helper `get_text_width(text, scale=1)`

### Sprite System
- [ ] Update emoji sprite sizes for new resolution
- [ ] Add sprite scaling helpers
- [ ] Ensure collision detection scales properly

---

## 🎨 Design Guidelines for 256×192

### ZX Spectrum Aesthetic
- Use classic ZX Spectrum color palette when appropriate
- Maintain chunky, pixel-perfect graphics
- Keep "retro" feel while using modern capabilities
- Border patterns in ZX style

### Layout Patterns
**For arcade games:**
```
┌─────────────────────────────────────┐
│ HUD / Score (256×12)                │
├────┬─────────────────────────┬──────┤
│ L  │                         │  R   │
│ E  │   Game Area             │  I   │
│ F  │   (192×192 square)      │  G   │
│ T  │   or                    │  H   │
│    │   (256×180 full)        │  T   │
│ 32 │                         │  32  │
├────┴─────────────────────────┴──────┤
│ Status Bar (256×12)                 │
└─────────────────────────────────────┘
```

**For utility apps:**
```
┌─────────────────────────────────────┐
│ Title / Tab Bar (256×24)            │
├─────────────────────────────────────┤
│                                     │
│   Main Content Area                 │
│   (256×144)                         │
│                                     │
├─────────────────────────────────────┤
│ Controls / Status (256×24)          │
└─────────────────────────────────────┘
```

### Typography
- **Small text:** 6px height (current)
- **Medium text:** 8px height (new standard)
- **Large text:** 12px height (headers)
- **Huge text:** 16-24px height (timer, scores)

### Sprite Sizes
- **Tiny:** 8×8 (pickups, bullets)
- **Small:** 12×12 (classic retro size)
- **Medium:** 16×16 (new standard)
- **Large:** 24×24 (player characters)
- **Huge:** 32×32 or 64×64 (bosses, special elements)

---

## 🧪 Testing Strategy

### For Each App:
1. **Visual Test:** Does it look good? Use full screen space?
2. **Gameplay Test:** Are mechanics preserved? Difficulty balanced?
3. **Performance Test:** Still 60 FPS at 3× pixels?
4. **Compatibility Test:** Works with framework changes?

### Test Checklist:
- [ ] All hardcoded dimensions updated
- [ ] No clipping or out-of-bounds issues
- [ ] Text readable and well-positioned
- [ ] Sprites scale appropriately
- [ ] Game balance maintained (difficulty, speed)
- [ ] Frame rate stable at 60 FPS
- [ ] HUD elements visible and clear
- [ ] Color palette appropriate

---

## 📝 Code Update Pattern

**Example transformation (Snake):**

```python
# OLD (128×128):
start_x, start_y = 64, 64
if new_head[0] >= 128 or new_head[1] >= 128:
    self.game_over = True
matrix.rect(0, 0, 128, 128, border_color)

# NEW (256×192):
start_x, start_y = 128, 96  # New center
if new_head[0] >= 256 or new_head[1] >= 192:
    self.game_over = True
matrix.rect(0, 12, 256, 180, border_color)  # Account for HUD
```

---

## 🎯 Success Metrics

- ✅ All games use full resolution effectively
- ✅ No wasted screen space
- ✅ Improved visual clarity and aesthetics
- ✅ Maintain 60 FPS performance
- ✅ Enhanced gameplay with new features
- ✅ Consistent ZX Spectrum retro aesthetic
- ✅ Better UI/HUD readability
- ✅ More game content visible (enemies, platforms, etc.)

---

## 📅 Estimated Timeline

- **Week 1:** Framework updates + Snake + Frogger
- **Week 2:** Space Invaders + Pac-Man
- **Week 3:** Platformer + Tetris + Breakout
- **Week 4:** News + Weather + polish
- **Week 5:** Clock + Timer + Demos + Settings + final testing

**Total: ~5 weeks for complete upgrade**

---

## 🚀 Next Steps

1. Update framework core (display.py, led_api.py)
2. Add layout helpers for common patterns
3. Start with Snake (simplest game)
4. Test thoroughly and document patterns
5. Apply patterns to remaining games
6. Create before/after screenshots
7. Update documentation

---

*This plan provides a clear roadmap to upgrade MatrixOS to 256×192 resolution while maintaining the retro aesthetic and improving visual quality across all apps.*
