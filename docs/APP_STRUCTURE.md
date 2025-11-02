# MatrixOS App Structure

Each app lives in its own folder under the root directory. The launcher automatically discovers and displays all valid apps.

## Required Files

### 1. `main.py`
The entry point for your app. Must contain a `main()` function that will be called when the app is launched.

```python
def main():
    """App entry point"""
    # Your app code here
    pass

if __name__ == '__main__':
    main()
```

### 2. `config.json`
App metadata and configuration.

```json
{
  "name": "My App",
  "author": "Your Name",
  "version": "1.0.0",
  "description": "A cool MatrixOS app"
}
```

### 3. `icon.json`
16x16 pixel icon for the launcher. Uses color codes:
- `0` = transparent/black
- `1` = white
- `2` = red
- `3` = green
- `4` = blue
- `5` = yellow
- `6` = cyan
- `7` = magenta

```json
{
  "pixels": [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    ... (16 rows total)
  ]
}
```

## Optional Files

- Additional Python modules
- Asset files (images, data, etc.)
- README.md for documentation

## Example Structure

```
my_app/
├── main.py          # Entry point
├── config.json      # App metadata
├── icon.json        # 16x16 launcher icon
├── game_logic.py    # Additional modules (optional)
└── assets/          # Assets folder (optional)
    └── data.json
```

## Creating a New App

1. Create a new folder in the project root
2. Add `main.py` with a `main()` function
3. Add `config.json` with app name and metadata
4. Add `icon.json` with your 16x16 icon
5. Your app will automatically appear in the launcher!

## Color Mapping

The launcher maps color codes to RGB values:
- `0`: (0, 0, 0)         - Black/Transparent
- `1`: (255, 255, 255)   - White
- `2`: (255, 0, 0)       - Red
- `3`: (0, 255, 0)       - Green
- `4`: (0, 0, 255)       - Blue
- `5`: (255, 255, 0)     - Yellow
- `6`: (0, 255, 255)     - Cyan
- `7`: (255, 0, 255)     - Magenta
