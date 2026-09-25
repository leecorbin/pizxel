# PiZXel - Running Modes

PiZXel runs on three displays: a Raspberry Pi framebuffer, a browser canvas
and the terminal. `npm start` picks the best one available (framebuffer →
canvas → terminal); the `start:*` scripts force one. The session server for
pizxel.uk (`npm run start:server`) is separate: see the README.

There's no build step: `tsx` runs the TypeScript directly.

## Terminal Mode

Run PiZXel with terminal-based display using Unicode block characters:

```bash
npm run start:term
```

**Features:**

- Runs entirely in terminal
- No browser needed
- Fast rendering
- Best for quick testing and development
- Uses keyboard input from terminal

**Controls:**

- Arrow keys: Navigate
- Enter/Space: Select/Launch
- ESC: Return to launcher / Exit
- Tab: Show help (in apps)

## Canvas Mode

Run PiZXel with web browser display:

```bash
npm run start:canvas
```

**Features:**

- Terminal display PLUS browser canvas
- Opens HTTP server on http://localhost:3001
- Real-time WebSocket updates
- 60 FPS display in browser
- Great for demos and remote viewing
- Keyboard input from the browser page (click it first) or the terminal

**After starting:**

1. Terminal shows the app running
2. Open http://localhost:3001 in your browser
3. You'll see the display rendered in browser
4. Control it with the keyboard in the browser, or in the terminal

**Canvas Display Features:**

- Retro ZX Spectrum aesthetic (cyan borders)
- FPS counter
- Frame count
- Latency display
- Connection status
- Multiple browser windows supported

## Quick Start

```bash
npm ci                   # Install dependencies (once)
npm start                # Best display available
npm run start:term       # Terminal
npm run start:canvas     # Browser canvas at http://localhost:3001
npm run start:fb         # Raspberry Pi framebuffer
npm test                 # The test suite
npx tsc --noEmit         # Type check
```

## Development Workflow

### Local Development (Mac/Linux/Windows)

```bash
# Browser canvas (keyboard works in the browser page)
npm run start:canvas

# Or the terminal
npm run start:term

# Test without touching your own saved data
PIZXEL_DATA_ROOT=/tmp/pizxel-test npm run start:canvas
```

### Raspberry Pi Deployment

```bash
# On a Pi with a display, npm start uses the framebuffer
npm start

# Or use canvas mode for remote viewing
npm run start:canvas
# Then access from another device at http://pi-ip-address:3001
```

## Architecture

Both modes use the same core framework:

```
┌─────────────────────────┐
│   App Framework         │
│   (Launcher, Apps)      │
└───────────┬─────────────┘
            │
┌───────────┴─────────────┐
│   Device Manager        │
│   (Drivers)             │
└─────┬───────────────┬───┘
      │               │
      │               │
┌─────┴─────┐   ┌────┴──────┐
│ Terminal  │   │ Keyboard  │
│ Display   │   │ Input     │
└─────┬─────┘   └───────────┘
      │
      │ (Canvas mode only)
┌─────┴─────────┐
│ Canvas Server │ ← HTTP :3001
│ (Socket.IO)   │
└───────────────┘
```

### Canvas Mode Integration

In canvas mode:

1. Terminal display still runs (you see it in terminal)
2. Canvas server starts on port 3001
3. Display driver's `show()` is hooked
4. Each frame is sent to:
   - Terminal (via original driver)
   - Browser (via WebSocket)

Both displays show the same content in real-time!

## Troubleshooting

### Port 3000/3001 already in use

```bash
# Kill existing process
lsof -ti:3001 | xargs kill -9

# Or use different port by editing index.ts
# Change: const port = 3001;
```

### Terminal display not working

- Make sure terminal supports Unicode
- Try a different terminal (iTerm2, Hyper, etc.)
- Check terminal size is adequate (minimum ~80x40)

### Canvas not updating

- Check browser console for errors
- Verify WebSocket connection (should see green "Connected")
- Refresh browser page
- Check network tab in dev tools

### Keyboard input not working

- Terminal must have focus
- Some terminals capture certain keys
- Try running in different terminal

## Examples

### Run Clock App (Terminal)

```bash
npm start
# Press Enter on "Clock" in launcher
```

### Run Clock App (Canvas)

```bash
npm run start:canvas
# Open http://localhost:3001
# Press Enter on "Clock" in launcher
# See clock in both terminal AND browser
```

### Run Canvas Demo (No Apps)

```bash
# Standalone canvas demo
node dist/pizxel/examples/canvas-demo.js
# Open http://localhost:3001
# See animated rectangle
```

## Next Steps

- Try both modes to see which you prefer
- Use canvas mode for screenshots/demos
- Use terminal mode for development speed
- Deploy to Pi with canvas mode for remote access

Enjoy PiZXel! 🎮✨
