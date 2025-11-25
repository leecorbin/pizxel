# PiZXel - Running Modes

PiZXel supports two display modes for development and deployment.

## Terminal Mode (Default)

Run PiZXel with terminal-based display using Unicode block characters:

```bash
npm start
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
- Still uses keyboard input from terminal

**After starting:**

1. Terminal shows the app running
2. Open http://localhost:3001 in your browser
3. You'll see the display rendered in browser
4. Control still happens via terminal keyboard

**Canvas Display Features:**

- Retro ZX Spectrum aesthetic (cyan borders)
- FPS counter
- Frame count
- Latency display
- Connection status
- Multiple browser windows supported

## Quick Start

```bash
# Build TypeScript
npm run build

# Terminal mode (fastest)
npm start

# Canvas mode (with browser display)
npm run start:canvas

# Run tests
npm test

# Clean build
npm run clean && npm run build
```

## Development Workflow

### Local Development (Mac/Linux/Windows)

```bash
# Watch mode for development
npm run dev

# In another terminal, run terminal mode
npm start

# Or run canvas mode to see in browser
npm run start:canvas
```

### Raspberry Pi Deployment

```bash
# On Pi, terminal mode is default
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
