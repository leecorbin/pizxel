#!/usr/bin/env python3
"""
Emoji Icon System for MatrixOS

Provides lightweight emoji-to-icon conversion with multiple fallback strategies.
No mandatory dependencies - works with bundled icons, optional font rendering,
or simple text fallbacks.
"""

import os
import json
import hashlib


# Common emojis to bundle (will be pre-generated)
BUNDLED_EMOJIS = [
    # Gaming
    "🕹️", "🎮", "👾", "🎯", "🎲", "🏆", "⚔️", "🛡️",
    # Games we have
    "🐍", "🧱", "🏓", "🐸", "👻", 
    # Apps
    "⏰", "⏲️", "📊", "🌦️", "🌡️", "📷", "🎨", "📝", "📺",
    # Symbols
    "⭐", "❤️", "🔥", "✨", "💡", "🔔", "📌", "⚙️", "🏠",
    # Numbers/UI
    "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "▶️", "⏸️", "⏹️", "🔄",
]


def emoji_to_codepoint_hex(emoji):
    """Convert emoji to hex codepoint string for filenames.
    
    Args:
        emoji: Emoji character (e.g., "🕹️")
    
    Returns:
        Hex string (e.g., "1f579-fe0f")
    """
    codepoints = [f"{ord(c):x}" for c in emoji]
    return "-".join(codepoints)


def get_emoji_icon_path(emoji, size=32):
    """Get path to bundled or cached emoji icon.
    
    Args:
        emoji: Emoji character
        size: Icon size (16 or 32)
    
    Returns:
        Path to icon JSON file, or None if not found
    """
    codepoint = emoji_to_codepoint_hex(emoji)
    
    # Check bundled emojis first
    bundled = os.path.join(
        os.path.dirname(__file__),
        f"emoji_icons/{codepoint}_{size}.json"
    )
    if os.path.exists(bundled):
        return bundled
    
    # Check user cache
    cache_dir = os.path.expanduser("~/.matrixos/emoji_cache")
    cached = os.path.join(cache_dir, f"{codepoint}_{size}.json")
    if os.path.exists(cached):
        return cached
    
    return None


def render_emoji_icon(emoji, size=32):
    """Render emoji to icon pixel array.
    
    This requires PIL and an emoji font to be installed.
    Used for development or first-time generation.
    
    Args:
        emoji: Emoji character
        size: Icon size (16 or 32)
    
    Returns:
        2D array of RGB pixel values, or None if can't render
    """
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        return None
    
    # Find emoji font
    font_paths = [
        '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf',
        '/System/Library/Fonts/Apple Color Emoji.ttc',
        'C:\\Windows\\Fonts\\seguiemj.ttf',
    ]
    
    font = None
    for path in font_paths:
        if os.path.exists(path):
            try:
                font = ImageFont.truetype(path, size - 4)
                break
            except:
                continue
    
    if not font:
        return None
    
    # Render emoji
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Center the emoji
    try:
        bbox = draw.textbbox((0, 0), emoji, font=font)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        x = (size - w) // 2 - bbox[0]
        y = (size - h) // 2 - bbox[1]
    except:
        x = 2
        y = 2
    
    # Draw (with fallback for non-color fonts)
    try:
        draw.text((x, y), emoji, font=font, embedded_color=True)
    except:
        draw.text((x, y), emoji, font=font, fill=(255, 255, 255))
    
    # Convert to RGB with black background (fully opaque)
    # This composites RGBA onto black, converting semi-transparent edge pixels to solid colors
    rgb_img = Image.new('RGB', (size, size), (0, 0, 0))
    if img.mode == 'RGBA':
        # Composite with alpha channel - this removes transparency
        # Semi-transparent pixels become darkened solid colors
        rgb_img.paste(img, mask=img.split()[3])
    else:
        rgb_img.paste(img)
    
    # Apply threshold to eliminate near-black anti-aliasing artifacts
    # Any pixel darker than this threshold becomes pure black (transparent in icon)
    threshold = 30  # Adjust this value: lower = more aggressive filtering
    pixels_data = rgb_img.load()
    for py in range(size):
        for px in range(size):
            r, g, b = pixels_data[px, py]
            # If pixel is very dark (likely anti-aliasing artifact), make it pure black
            if r < threshold and g < threshold and b < threshold:
                pixels_data[px, py] = (0, 0, 0)
    
    # Convert to pixel array
    pixels = []
    for y in range(size):
        row = []
        for x in range(size):
            row.append(list(rgb_img.getpixel((x, y))))
        pixels.append(row)
    
    return pixels


def generate_emoji_icon(emoji, size=32, output_path=None):
    """Generate and save an emoji icon.
    
    Args:
        emoji: Emoji character
        size: Icon size (16 or 32)
        output_path: Where to save (default: user cache)
    
    Returns:
        Path to saved icon, or None on failure
    """
    pixels = render_emoji_icon(emoji, size)
    if not pixels:
        return None
    
    if output_path is None:
        cache_dir = os.path.expanduser("~/.matrixos/emoji_cache")
        os.makedirs(cache_dir, exist_ok=True)
        codepoint = emoji_to_codepoint_hex(emoji)
        output_path = os.path.join(cache_dir, f"{codepoint}_{size}.json")
    
    icon_data = {
        "format": "rgb",
        "emoji": emoji,
        "codepoint": emoji_to_codepoint_hex(emoji),
        "pixels": pixels
    }
    
    with open(output_path, 'w') as f:
        json.dump(icon_data, f)
    
    return output_path


def render_text_fallback(text, size=32):
    """Render simple text as fallback icon (no dependencies).
    
    Uses a built-in tiny font to render 1-2 characters.
    
    Args:
        text: Text to render (usually first char of emoji or app name)
        size: Icon size
    
    Returns:
        2D array of RGB pixel values
    """
    # Simple 5×7 character patterns for common chars
    # (We could expand this or use matrixos.font module)
    patterns = {
        '?': [
            [0,1,1,1,0],
            [1,0,0,0,1],
            [0,0,0,1,0],
            [0,0,1,0,0],
            [0,0,1,0,0],
            [0,0,0,0,0],
            [0,0,1,0,0],
        ],
    }
    
    # Default to '?' if char not in patterns
    pattern = patterns.get(text[0], patterns['?'])
    
    # Scale up to fill icon
    scale = size // 7
    pixels = []
    
    for y in range(size):
        row = []
        for x in range(size):
            # Map to pattern coordinates
            py = y // scale
            px = x // scale - (size // scale - 5) // 2
            
            if 0 <= py < len(pattern) and 0 <= px < len(pattern[0]) and pattern[py][px]:
                row.append([200, 200, 200])  # Gray
            else:
                row.append([0, 0, 0])  # Black
        pixels.append(row)
    
    return pixels


def get_emoji_icon(emoji, size=32):
    """Get emoji icon pixels with automatic fallbacks.
    
    Strategy:
    1. Check bundled icons
    2. Check user cache
    3. Try to render (if PIL + font available)
    4. Fall back to text rendering
    
    Args:
        emoji: Emoji character
        size: Icon size (16 or 32)
    
    Returns:
        2D array of RGB pixel values
    """
    # Try existing icon
    icon_path = get_emoji_icon_path(emoji, size)
    if icon_path:
        with open(icon_path, 'r') as f:
            data = json.load(f)
            return data['pixels']
    
    # Try to render it
    pixels = render_emoji_icon(emoji, size)
    if pixels:
        # Cache it for next time
        generate_emoji_icon(emoji, size)
        return pixels
    
    # Last resort: text fallback
    return render_text_fallback(emoji, size)


# For bundled emoji generation (run during development)
def generate_bundled_emojis():
    """Generate all bundled emojis (run once during development)."""
    output_dir = os.path.join(os.path.dirname(__file__), "emoji_icons")
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Generating {len(BUNDLED_EMOJIS)} bundled emojis...")
    
    for emoji in BUNDLED_EMOJIS:
        for size in [16, 32]:
            codepoint = emoji_to_codepoint_hex(emoji)
            output_path = os.path.join(output_dir, f"{codepoint}_{size}.json")
            
            if os.path.exists(output_path):
                print(f"  ✓ {emoji} ({size}×{size}) - already exists")
                continue
            
            result = generate_emoji_icon(emoji, size, output_path)
            if result:
                print(f"  ✅ {emoji} ({size}×{size}) - generated")
            else:
                print(f"  ❌ {emoji} ({size}×{size}) - failed!")
    
    print(f"\nDone! Bundled icons saved to {output_dir}")


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--generate-bundled':
        generate_bundled_emojis()
    elif len(sys.argv) > 1:
        # Test specific emoji
        emoji = sys.argv[1]
        size = int(sys.argv[2]) if len(sys.argv) > 2 else 32
        
        print(f"Testing emoji: {emoji} at {size}×{size}")
        pixels = get_emoji_icon(emoji, size)
        
        # ASCII preview
        print("\nPreview:")
        for row in pixels:
            line = ""
            for pixel in row:
                gray = sum(pixel) // 3
                if gray < 32:
                    line += " "
                elif gray < 128:
                    line += "░"
                else:
                    line += "█"
            print(line)
    else:
        print("Usage:")
        print("  python3 -m matrixos.emoji_icons --generate-bundled")
        print("  python3 -m matrixos.emoji_icons '🕹️' 32")
