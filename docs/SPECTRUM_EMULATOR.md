# ZX Spectrum Emulator - MatrixOS Ultimate Vision

## Overview

The ultimate vision for MatrixOS is to run a **full ZX Spectrum 48K emulator** as a native app, enabling classic gaming and computing on a modern LED matrix display. This document outlines the technical plan for implementing this feature.

## Hardware Configuration

### Display: 256×192 Resolution (6× LED Panels)

**Panel Layout:**
```
┌─────────────┬─────────────┐
│  128×64 #1  │  128×64 #2  │  ← Top row
├─────────────┼─────────────┤
│  128×64 #3  │  128×64 #4  │  ← Middle row
├─────────────┼─────────────┤
│  128×64 #5  │  128×64 #6  │  ← Bottom row
└─────────────┴─────────────┘

Combined: 256×192 pixels
```

**Perfect Match:** 256×192 is the **exact native resolution** of the ZX Spectrum display!

### Target Hardware

- **Primary**: Raspberry Pi Zero (512MB RAM, 1GHz ARM11)
- **Alternative**: Pi 3/4/5 for more power
- **Display**: 6× HUB75 RGB LED Matrix panels (128×64 each)
- **Input**: Bluetooth keyboard/joypad + on-screen keyboard
- **Storage**: SD card for ROM and game files

## Feasibility Analysis

### Performance Assessment

**ZX Spectrum Original Specs:**
- CPU: Z80A @ 3.5MHz
- RAM: 48KB (or 128KB for Spectrum 128)
- Display: 256×192, 8-color
- Frame rate: 50Hz (PAL standard)

**Pi Zero Capabilities:**
- CPU: ARM11 @ 1GHz (single core)
- ~**285× faster** than original Z80
- More than sufficient for full-speed emulation

**Benchmark Evidence:**
- FUSE emulator runs full-speed on Pi Zero
- Python-based emulators (PyZX, Spectacol) work on modern hardware
- JSSpeccy (JavaScript) runs in browser at full speed
- Z80 emulation is extremely efficient

### ✅ **Verdict: HIGHLY FEASIBLE**

The Pi Zero has more than enough power to emulate a ZX Spectrum at full speed, even with Python. Critical sections can be optimized with Cython or NumPy if needed.

## Technical Architecture

### Option A: Pure Python Implementation (Recommended)

Build the emulator as a native MatrixOS app in Python.

**Advantages:**
- Perfect integration with MatrixOS
- Educational value
- Full control over features
- Matches existing codebase style
- ZX Spectrum font already implemented!

**Structure:**
```
matrixos/
  emulators/
    __init__.py
    z80_cpu.py          # Z80 CPU emulation
    spectrum_ula.py     # ULA (display, border, beeper)
    spectrum_memory.py  # Memory management
    spectrum_io.py      # I/O ports, keyboard
    tape_loader.py      # TAP/TZX file support

apps/
  spectrum/
    main.py             # Spectrum emulator app
    config.json         # App metadata
    icon.json           # 32×32 icon
    roms/
      spectrum48.rom    # ZX Spectrum 48K ROM
    games/
      *.tap             # Game files
      *.tzx
```

### Option B: Bridge to Native Emulator

Integrate existing C-based emulator (FUSE) via subprocess or ctypes.

**Advantages:**
- Guaranteed full speed
- Mature, battle-tested code
- Complete feature set
- Less development work

**Disadvantages:**
- More complex integration
- Less control over UI/UX
- External dependency

### Option C: Future TypeScript/WASM

If MatrixOS migrates to TypeScript/Deno, use existing JavaScript Z80 emulators.

**Advantages:**
- Many mature JS emulators exist (JSSpeccy)
- Can compile C emulator to WASM
- Modern tooling

## Implementation Roadmap

### Phase 1: Core CPU Emulation (2-3 weeks)

**Goal:** Working Z80 CPU that can execute code

- [ ] Implement Z80 instruction set (~700 opcodes)
  - 8-bit arithmetic/logic (ADD, SUB, AND, OR, XOR, CP, INC, DEC)
  - 16-bit arithmetic (ADD HL, INC/DEC pairs)
  - Load/store (LD r,r / LD r,n / LD r,(HL) etc.)
  - Stack operations (PUSH, POP, CALL, RET)
  - Jumps and conditions (JP, JR, DJNZ)
  - Bit operations (BIT, SET, RES)
  - Rotate/shift (RLC, RRC, RL, RR, SLA, SRA, SRL)
  - Special (DAA, CPL, NEG, etc.)
  - ED prefix instructions
  - CB prefix instructions
  - IX/IY indexed operations
- [ ] Implement registers (A, F, B, C, D, E, H, L, IX, IY, SP, PC)
- [ ] Implement flags (S, Z, H, P/V, N, C)
- [ ] Timing: Track T-states for accurate emulation
- [ ] Interrupts: IM 0, IM 1, IM 2

**Reference Libraries:**
- `PyZ80` - Pure Python Z80 emulator (study for implementation)
- `z80ex` - C library (could wrap with ctypes)

### Phase 2: Memory and I/O (1 week)

**Goal:** Complete memory system and basic I/O

- [ ] 64KB addressable memory space
- [ ] ROM at 0x0000-0x3FFF (16KB - Spectrum ROM)
- [ ] RAM at 0x4000-0xFFFF (48KB)
- [ ] Screen memory at 0x4000-0x5AFF (6912 bytes)
  - Bitmap: 6144 bytes (256×192 ÷ 8)
  - Attributes: 768 bytes (32×24 cells)
- [ ] I/O port handling
  - Port 0xFE: Border color, EAR, MIC, keyboard
  - ULA port reading (keyboard matrix)

### Phase 3: Display System (1 week)

**Goal:** Render Spectrum screen to LED matrix

- [ ] Decode Spectrum bitmap format
  - Unusual memory layout: thirds of screen interleaved
  - Address mapping: `(Y div 64)*2048 + (Y mod 8)*256 + (Y div 8 mod 8)*32 + X div 8`
- [ ] Decode attribute bytes (INK, PAPER, BRIGHT, FLASH)
- [ ] Convert to RGB for LED matrix
  - Map ZX colors (0-7) to RGB
  - Handle BRIGHT attribute (2 levels per color)
  - Implement FLASH attribute (blinking)
- [ ] Render border color
- [ ] Optimize for 50Hz refresh

**ZX Spectrum Color Palette:**
```python
SPECTRUM_COLORS_NORMAL = [
    (0, 0, 0),       # 0: Black
    (0, 0, 215),     # 1: Blue
    (215, 0, 0),     # 2: Red
    (215, 0, 215),   # 3: Magenta
    (0, 215, 0),     # 4: Green
    (0, 215, 215),   # 5: Cyan
    (215, 215, 0),   # 6: Yellow
    (215, 215, 215), # 7: White
]

SPECTRUM_COLORS_BRIGHT = [
    (0, 0, 0),       # 0: Black (same)
    (0, 0, 255),     # 1: Bright Blue
    (255, 0, 0),     # 2: Bright Red
    (255, 0, 255),   # 3: Bright Magenta
    (0, 255, 0),     # 4: Bright Green
    (0, 255, 255),   # 5: Bright Cyan
    (255, 255, 0),   # 6: Bright Yellow
    (255, 255, 255), # 7: Bright White
]
```

### Phase 4: Keyboard Input (1 week)

**Goal:** Full Spectrum keyboard functionality

- [ ] Implement keyboard matrix (8×5 = 40 keys)
- [ ] Map MatrixOS keyboard to Spectrum keys
- [ ] Read port 0xFE for keyboard state
- [ ] Support CAPS SHIFT and SYMBOL SHIFT
- [ ] On-screen keyboard for full Spectrum input
  - Shifted characters (symbols, graphics)
  - Color codes for BASIC programming
  - Cursor control

**Keyboard Matrix:**
```
Port    Bit 0    Bit 1    Bit 2    Bit 3    Bit 4
0xFEFE  SHIFT    Z        X        C        V
0xFDFE  A        S        D        F        G
0xFBFE  Q        W        E        R        T
0xF7FE  1        2        3        4        5
0xEFFE  0        9        8        7        6
0xDFFE  P        O        I        U        Y
0xBFFE  ENTER    L        K        J        H
0x7FFE  SPACE    SYM SHFT M        N        B
```

**MatrixOS Key Mapping:**
```python
# Arrow keys → Cursor keys (SHIFT + 5/6/7/8)
UP    → CAPS SHIFT + 7
DOWN  → CAPS SHIFT + 6
LEFT  → CAPS SHIFT + 5
RIGHT → CAPS SHIFT + 8
OK    → ENTER
BACK  → CAPS SHIFT + SPACE (BREAK)
```

### Phase 5: Audio (Beeper) (1 week)

**Goal:** Basic sound support

- [ ] Emulate 1-bit beeper (port 0xFE bit 4)
- [ ] Generate square wave audio
- [ ] Mix with MIC input (for tape loading sounds)
- [ ] Use `pygame.mixer` or `pyaudio`
- [ ] Handle at correct sample rate

**Challenge:** Pi Zero audio may require optimization

### Phase 6: Tape Loading (1-2 weeks)

**Goal:** Load games from TAP/TZX files

- [ ] Parse TAP file format (simple concatenated blocks)
- [ ] Parse TZX file format (more complex, various block types)
- [ ] Implement LOAD "" routine interception
- [ ] Fast loading (instant, bypass tape simulation)
- [ ] Optional: Real tape loading with audio playback
- [ ] Visual tape loading progress bar

**TAP Format:**
```
Block structure:
  2 bytes: Length (little-endian)
  N bytes: Data
  
First byte of data:
  0x00 = Header block
  0xFF = Data block
```

### Phase 7: MatrixOS Integration (1 week)

**Goal:** Polish the Spectrum app for MatrixOS

- [ ] Create SpectrumApp(App) class
- [ ] Implement app lifecycle methods
  - `on_activate()`: Resume emulation
  - `on_deactivate()`: Pause emulation
  - `on_update(delta_time)`: Execute frame
  - `on_event(event)`: Handle input
  - `render(matrix)`: Draw screen
- [ ] File browser for game selection
- [ ] Save/load state system (serialize emulator state)
- [ ] Settings: Speed, sound, filters
- [ ] Help overlay with keyboard layout

### Phase 8: Polish & Features (Ongoing)

**Core Features:**
- [ ] Full speed emulation (50fps locked)
- [ ] Accurate timing
- [ ] Save states (multiple slots)
- [ ] Screenshot capture
- [ ] Cheat system (POKE values, infinite lives)

**Enhanced Features:**
- [ ] Fast forward (2×, 4× speed)
- [ ] Rewind (save state buffer)
- [ ] Memory viewer/editor
- [ ] Debugger (step, breakpoints, disassembly)
- [ ] Recording (input replay)
- [ ] Spectru 128K support
- [ ] AY-3-8912 sound chip (Spectrum 128)

**Modern Improvements:**
- [ ] Enhanced color palette (use full RGB)
- [ ] Smoothing filters (CRT simulation)
- [ ] Turbo loading
- [ ] Cloud save sync
- [ ] Multiplayer (network link two Spectrums)

## UI/UX Design

### Main Menu

```
┌────────────────────────────────────────┐
│        ZX SPECTRUM EMULATOR            │
├────────────────────────────────────────┤
│  > LOAD GAME                           │
│    RESET                               │
│    SETTINGS                            │
│    HELP                                │
│    EXIT                                │
└────────────────────────────────────────┘
```

### Game Browser

```
┌────────────────────────────────────────┐
│  GAMES                        [12/45]  │
├────────────────────────────────────────┤
│  > Manic Miner            [TAP] 1983   │
│    Jet Set Willy          [TAP] 1984   │
│    Head Over Heels        [TZX] 1987   │
│    Dizzy                  [TAP] 1987   │
│                                        │
│  ↑↓: Select  ENTER: Load  ESC: Back   │
└────────────────────────────────────────┘
```

### In-Game Overlay (TAB key)

```
┌────────────────────────────────────────┐
│  PAUSED                                │
├────────────────────────────────────────┤
│  F1  - Save State                      │
│  F2  - Load State                      │
│  F3  - Reset                           │
│  F4  - Keyboard Layout                 │
│  ESC - Resume                          │
│  Q   - Exit to Menu                    │
└────────────────────────────────────────┘
```

### On-Screen Keyboard Mode

Show full Spectrum keyboard layout for BASIC programming:
```
┌─────────────────────────────────────────────────────────┐
│  1  2  3  4  5  6  7  8  9  0                           │
│   Q  W  E  R  T  Y  U  I  O  P                          │
│    A  S  D  F  G  H  J  K  L  ENTER                     │
│  SHIFT Z  X  C  V  B  N  M  SYMB SPACE                  │
├─────────────────────────────────────────────────────────┤
│  SHIFT: Hold for shift │ SYMB: Hold for symbols         │
└─────────────────────────────────────────────────────────┘
```

## Testing Strategy

### Unit Tests

```python
# tests/test_z80.py
def test_z80_ld_r_r():
    cpu = Z80CPU()
    cpu.execute([0x78])  # LD A,B
    assert cpu.A == cpu.B

def test_z80_add_a_n():
    cpu = Z80CPU()
    cpu.A = 10
    cpu.execute([0xC6, 5])  # ADD A,5
    assert cpu.A == 15
```

### Integration Tests

```python
# tests/test_spectrum.py
def test_spectrum_boot():
    spectrum = SpectrumEmulator()
    spectrum.load_rom("spectrum48.rom")
    spectrum.reset()
    spectrum.run_frames(50)  # Run for 1 second
    # Check for copyright message in screen memory
    assert b"Sinclair" in spectrum.memory[0x4000:0x5B00]
```

### Performance Tests

```python
def test_performance():
    spectrum = SpectrumEmulator()
    start = time.time()
    spectrum.run_frames(300)  # 6 seconds at 50fps
    elapsed = time.time() - start
    assert elapsed < 7.0  # Should run in real-time + margin
```

### Game Tests

- Load and run 10+ popular games
- Verify correct rendering
- Check keyboard responsiveness
- Ensure sound plays correctly
- Test save/load states

## Resources

### Z80 Documentation
- **Z80 CPU User Manual** - Official Zilog documentation
- **The Undocumented Z80 Documented** - Undocumented flags and behaviors
- **Z80 Instruction Set** - Complete opcode reference

### Spectrum Documentation
- **Complete Spectrum ROM Disassembly** - Understanding BASIC and system routines
- **Spectrum ULA Book** - Display and I/O timing
- **World of Spectrum** (archive.org) - Game files and documentation

### Existing Emulators (Study/Reference)
- **FUSE** (Free Unix Spectrum Emulator) - C, very accurate
- **PyZX** - Python Z80 implementation
- **JSSpeccy** - JavaScript, excellent reference for display rendering
- **SpecEmu** - Another mature emulator

### TAP/TZX File Archives
- **World of Spectrum Archive** - Thousands of games
- **Spectrum Computing** - Modern archive with screenshots
- **rzxarchive.co.uk** - Recording files

## Performance Optimization

### Critical Paths

**If Python is too slow (unlikely), optimize:**

1. **Z80 instruction dispatch**: Use dict lookup or match/case
2. **Screen rendering**: Use NumPy for batch pixel operations
3. **Memory access**: Use bytearray or memoryview
4. **Cython**: Compile hot paths to C

### Example: Cythonized Z80

```cython
# z80_cpu.pyx
cdef class Z80CPU:
    cdef unsigned char A, F, B, C, D, E, H, L
    cdef unsigned short PC, SP, IX, IY
    cdef unsigned char memory[65536]
    
    cdef inline unsigned char read_memory(self, unsigned short addr):
        return self.memory[addr]
    
    cpdef execute_instruction(self):
        cdef unsigned char opcode = self.read_memory(self.PC)
        # Fast native code execution
```

### Benchmarking

```python
import cProfile
import pstats

profiler = cProfile.Profile()
profiler.enable()

spectrum.run_frames(300)

profiler.disable()
stats = pstats.Stats(profiler)
stats.sort_stats('cumulative')
stats.print_stats(20)  # Top 20 functions by time
```

## Future Enhancements

### Spectrum 128K Support
- Additional 64KB RAM (bank switching)
- AY-3-8912 sound chip (3-channel)
- Different ROM (128K BASIC)

### Peripheral Emulation
- Interface 1 (Microdrive)
- Interface 2 (ROM cartridges, joystick)
- Kempston joystick
- Fuller Box audio
- DivIDE (IDE hard drive interface)

### Modern Features
- NetPlay - multiplayer over network
- Cloud saves - sync states to cloud
- Achievements - track game progress
- Leaderboards - compare high scores
- Streaming - broadcast gameplay

### Multiple Emulators
Once the Z80 core is working, it's easy to add:
- **ZX Spectrum Next** - Modern Spectrum
- **Amstrad CPC** - Similar Z80 system
- **MSX** - Japanese Z80 computer
- **Sega Master System** - Z80-based console
- **Game Boy** - Modified Z80 (Sharp LR35902)

## Development Timeline

**Assuming part-time development (10-15 hours/week):**

- **Weeks 1-3**: Z80 CPU core
- **Week 4**: Memory and I/O
- **Week 5**: Display rendering
- **Week 6**: Keyboard input
- **Week 7**: Audio (beeper)
- **Weeks 8-9**: Tape loading
- **Week 10**: MatrixOS integration
- **Weeks 11-12**: Polish and optimization

**Total: ~12 weeks (~80-120 hours)**

For reference: Experienced emulator developers can create basic Z80 emulator in 2-3 weeks.

## Conclusion

**The ZX Spectrum emulator is the ultimate vision for MatrixOS.** With the perfect 256×192 display, matching ZX font, and modern LED matrix hardware, this will be an incredible retro computing experience in a picture frame form factor.

**This is totally achievable!** The Pi Zero has plenty of power, and the technical challenges are well-understood. Thousands of games await!

Once MatrixOS has:
- ✅ Solid core framework
- ✅ On-screen keyboard
- ✅ File management
- ✅ Save/load system

...then we can begin the Spectrum emulator development.

---

**"The future is retro!"** 🎮✨

Let's make this happen! When you're ready, say the word and we'll start building the emulator. The Speccy awaits! 🖥️🌈
