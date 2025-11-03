# Repository Structure

## Overview
This repository is designed for a git-friendly workflow where users can:
1. `git clone` the repository
2. Add their own apps to `apps/`
3. `git pull` to get updates without conflicts

## Directory Layout

```
led-matrix-project/
├── matrixos/              # Core OS code (tracked in git)
│   ├── apps/              # System apps (never modified by users)
│   │   └── settings/      # Settings app
│   └── ...                # Other OS modules
│
├── examples/              # Shipped example apps (tracked in git, deletable)
│   ├── breakout/
│   ├── demos/
│   ├── frogger/
│   ├── pacman/
│   ├── snake/
│   ├── tetris/
│   ├── timer/
│   └── weather/
│
├── apps/                  # User apps (gitignored, preserved across updates)
│   └── .gitkeep           # Only tracked file
│
├── settings/              # Runtime data (gitignored)
│   ├── config/            # User configuration
│   │   └── system_config.json
│   └── cache/             # Downloaded emojis, etc.
│
└── docs/examples/         # Code examples and tutorials
```

## Configuration System

### Two-Tier Config
- **Template:** `matrixos/system_config.json` (tracked in git)
  - Updated when you `git pull`
  - Contains default settings and new features
  
- **Runtime:** `settings/config/system_config.json` (gitignored)
  - Your actual configuration
  - Created on first run
  - Merged with template on updates (your values preserved)

### How Updates Work
1. You modify settings via the Settings app → saved to `settings/config/`
2. You `git pull` → template in `matrixos/` updates
3. On next run: system merges template + your config
   - Your modified values preserved
   - New default settings added automatically

## App Discovery Order

The launcher discovers apps in this order:
1. **examples/** - Shipped example apps appear first
2. **apps/** - Your custom apps in the middle
3. **matrixos/apps/** - System apps (Settings) appear last

## Pagination

The launcher supports unlimited apps with pagination:
- Displays 9 apps per page (3×3 grid)
- L1/R1 buttons to switch pages
- Page indicator: "APP NAME (2/3)"

## For Developers

### Adding Your Own App
1. Create directory: `apps/my_app/`
2. Add required files:
   - `main.py` - Entry point
   - `config.json` - App metadata
   - `icon.json` - App icon (or use emoji)
3. Restart MatrixOS

### Git Workflow
```bash
# Initial setup
git clone <repo>
cd led-matrix-project

# Add your app
mkdir apps/my_game
# ... create app files ...

# Update OS without losing your work
git pull  # Safe! apps/ and settings/ are gitignored
```

### What's Gitignored
- `apps/*` (except `.gitkeep`)
- `settings/*` (except `.gitkeep`)
- `__pycache__/`
- Standard Python artifacts

## System Files

### Important OS Modules
- `matrixos/system_config_loader.py` - Config template/runtime merge logic
- `matrixos/builtin_apps/launcher.py` - Multi-directory app discovery + pagination
- `start.py` - OS entry point

### Development Tools
- `matrixos/tools/generate_emoji_spritesheet.py` - Emoji sprite sheet generator
